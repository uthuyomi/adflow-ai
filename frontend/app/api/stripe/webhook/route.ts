import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { PLANS } from "@/lib/billing/plans";
import { refundedCredits } from "@/lib/billing/stripe-policy";
import { creditPackFromStripePrice, planFromStripePrice } from "@/lib/billing/stripe-catalog";
import { getStripe } from "@/lib/stripe/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function toIso(seconds?: number | null) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function assertSupabaseSuccess(error: { message: string } | null, operation: string) {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

async function upsertSubscriptionProfile(subscription: Stripe.Subscription, eventId?: string) {
  const supabase = getSupabaseAdminClient();
  const item = subscription.items.data[0];
  const period = subscription as Stripe.Subscription & {
    current_period_start?: number | null;
    current_period_end?: number | null;
  };
  const planId = planFromStripePrice(item?.price.id);
  if (!planId || planId === "free" || planId === "business") {
    throw new Error("Subscription uses an unknown or non-billable plan price.");
  }
  const userId = subscription.metadata.userId;
  if (!userId) return;

  const { error: profileError } = await supabase.from("user_billing_profiles").upsert(
    {
      user_id: userId,
      stripe_customer_id: String(subscription.customer),
      stripe_subscription_id: subscription.id,
      plan: planId,
      subscription_status: subscription.status,
      current_period_start: toIso(period.current_period_start),
      current_period_end: toIso(period.current_period_end),
    },
    { onConflict: "user_id" },
  );
  assertSupabaseSuccess(profileError, "Unable to update billing profile");

  if (eventId && (subscription.status === "active" || subscription.status === "trialing")) {
    const { error: creditError } = await supabase.rpc("grant_monthly_credits", {
      p_user_id: userId,
      p_amount: PLANS[planId].monthlyCredits,
      p_reason: "subscription_invoice_paid",
      p_stripe_event_id: eventId,
    });
    assertSupabaseSuccess(creditError, "Unable to grant monthly credits");
  }
}

async function addCreditsFromCheckoutSession(session: Stripe.Checkout.Session, eventId: string) {
  if (session.mode !== "payment" || session.payment_status !== "paid") return;
  const userId = session.metadata?.userId;
  if (!userId) throw new Error("Paid credit checkout is missing user metadata.");

  const stripe = getStripe();
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
  const pack = creditPackFromStripePrice(lineItems.data[0]?.price?.id);
  if (!pack) throw new Error("Checkout session uses an unknown credit pack price.");

  const metadataCredits = Number(session.metadata?.credits || 0);
  if (metadataCredits !== pack.credits) throw new Error("Checkout credit metadata does not match the configured price.");

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.rpc("add_purchased_credits", {
    p_user_id: userId,
    p_amount: pack.credits,
    p_reason: pack.id,
    p_stripe_event_id: eventId,
  });
  assertSupabaseSuccess(error, "Unable to add purchased credits");
}

async function markWebhookEvent(event: Stripe.Event, status: "processing" | "completed" | "failed", errorMessage?: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("stripe_webhook_events").upsert(
    {
      event_id: event.id,
      event_type: event.type,
      status,
      error_message: errorMessage || null,
      processed_at: status === "completed" ? new Date().toISOString() : null,
    },
    { onConflict: "event_id" },
  );
  assertSupabaseSuccess(error, "Unable to record Stripe webhook event");
}

async function handleRefund(charge: Stripe.Charge, eventId: string) {
  const paymentIntent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntent || charge.amount_refunded <= 0) return;
  const stripe = getStripe();
  const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 });
  const session = sessions.data[0];
  const userId = session?.metadata?.userId || charge.metadata.userId;
  const totalCredits = Number(session?.metadata?.credits || charge.metadata.credits || 0);
  if (!userId || !totalCredits) return;
  const amount = refundedCredits(totalCredits, charge.amount_refunded, charge.amount);
  if (!amount) return;
  const { error } = await getSupabaseAdminClient().rpc("refund_purchased_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: "stripe_charge_refunded",
    p_stripe_event_id: eventId,
  });
  assertSupabaseSuccess(error, "Unable to refund purchased credits");
}

async function markSubscriptionPaymentFailed(subscriptionId: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("user_billing_profiles")
    .update({ subscription_status: "past_due" })
    .eq("stripe_subscription_id", subscriptionId);
  assertSupabaseSuccess(error, "Unable to mark subscription payment failure");
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is required." }, { status: 500 });
  }

  const stripe = getStripe();
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Stripe signature is required." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: existingEvent } = await supabase
    .from("stripe_webhook_events")
    .select("status")
    .eq("event_id", event.id)
    .maybeSingle();
  if (existingEvent?.status === "completed") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await markWebhookEvent(event, "processing");
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      await addCreditsFromCheckoutSession(session, event.id);
      if (session.mode === "subscription" && userId && typeof session.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await upsertSubscriptionProfile(subscription);
      }
    }

    if (event.type === "checkout.session.async_payment_succeeded") {
      await addCreditsFromCheckoutSession(event.data.object as Stripe.Checkout.Session, event.id);
    }

    if (event.type === "customer.subscription.updated") {
      await upsertSubscriptionProfile(event.data.object as Stripe.Subscription);
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null;
        parent?: {
          subscription_details?: {
            subscription?: string | Stripe.Subscription | null;
          } | null;
        } | null;
      };
      const parentSubscription = invoice.parent?.subscription_details?.subscription;
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id ||
            (typeof parentSubscription === "string" ? parentSubscription : parentSubscription?.id);
      if (subscriptionId) {
        if (event.type === "invoice.payment_failed") {
          await markSubscriptionPaymentFailed(subscriptionId);
        } else {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertSubscriptionProfile(subscription, event.id);
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const { data: profile } = await supabase
        .from("user_billing_profiles")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();
      const userId = (profile?.user_id || subscription.metadata.userId) as string | undefined;
      if (userId) {
        const { error: profileError } = await supabase.from("user_billing_profiles").upsert(
          {
            user_id: userId,
            stripe_customer_id: String(subscription.customer),
            stripe_subscription_id: null,
            plan: "free",
            subscription_status: "canceled",
            current_period_start: null,
            current_period_end: null,
          },
          { onConflict: "user_id" },
        );
        assertSupabaseSuccess(profileError, "Unable to cancel billing profile");
        const { error: creditError } = await supabase.rpc("grant_monthly_credits", {
          p_user_id: userId,
          p_amount: PLANS.free.monthlyCredits,
          p_reason: "subscription_canceled_free_reset",
          p_stripe_event_id: event.id,
        });
        assertSupabaseSuccess(creditError, "Unable to reset free credits");
      }
    }

    if (event.type === "charge.refunded") {
      await handleRefund(event.data.object as Stripe.Charge, event.id);
    }

    await markWebhookEvent(event, "completed");
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe webhook processing failed.";
    await markWebhookEvent(event, "failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
