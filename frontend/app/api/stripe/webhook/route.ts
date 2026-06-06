import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { PLANS, type BillingCurrency, type PlanId } from "@/lib/billing/plans";
import { getStripe } from "@/lib/stripe/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function toIso(seconds?: number | null) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function planFromPrice(priceId?: string | null): PlanId | null {
  if (!priceId) return null;
  if (
    process.env.STRIPE_PRICE_PRO_MONTHLY === priceId ||
    process.env.STRIPE_PRICE_PRO_MONTHLY_USD === priceId
  ) {
    return "growth";
  }
  for (const plan of Object.values(PLANS)) {
    for (const currency of ["jpy", "usd"] satisfies BillingCurrency[]) {
      const envKey = plan.prices[currency].stripePriceEnvKey;
      if (envKey && process.env[envKey] === priceId) {
        return plan.id;
      }
    }
  }
  return null;
}

function normalizePlanId(value?: string | null): PlanId {
  if (value === "pro") return "growth";
  return value && value in PLANS ? (value as PlanId) : "free";
}

async function upsertSubscriptionProfile(subscription: Stripe.Subscription, eventId?: string) {
  const supabase = getSupabaseAdminClient();
  const item = subscription.items.data[0];
  const period = subscription as Stripe.Subscription & {
    current_period_start?: number | null;
    current_period_end?: number | null;
  };
  const planId = planFromPrice(item?.price.id) ?? normalizePlanId(subscription.metadata.planId);
  const userId = subscription.metadata.userId;
  if (!userId) return;

  await supabase.from("user_billing_profiles").upsert(
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

  if (eventId && (subscription.status === "active" || subscription.status === "trialing")) {
    await supabase.rpc("grant_monthly_credits", {
      p_user_id: userId,
      p_amount: PLANS[planId].monthlyCredits,
      p_reason: "subscription_invoice_paid",
      p_stripe_event_id: eventId,
    });
  }
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (session.mode === "payment" && userId) {
      const credits = Number(session.metadata?.credits || 0);
      if (credits > 0) {
        await supabase.rpc("add_purchased_credits", {
          p_user_id: userId,
          p_amount: credits,
          p_reason: session.metadata?.packId || "credit_pack_purchase",
          p_stripe_event_id: event.id,
        });
      }
    }
    if (session.mode === "subscription" && userId) {
      await supabase.from("user_billing_profiles").upsert(
        {
          user_id: userId,
          stripe_customer_id: String(session.customer),
          stripe_subscription_id: String(session.subscription),
          plan: normalizePlanId(session.metadata?.planId),
          subscription_status: "active",
        },
        { onConflict: "user_id" },
      );
    }
  }

  if (event.type === "customer.subscription.updated") {
    await upsertSubscriptionProfile(event.data.object as Stripe.Subscription);
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    };
    const subscriptionId =
      typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await upsertSubscriptionProfile(subscription, event.id);
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
      await supabase.from("user_billing_profiles").upsert(
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
      await supabase.rpc("grant_monthly_credits", {
        p_user_id: userId,
        p_amount: PLANS.free.monthlyCredits,
        p_reason: "subscription_canceled_free_reset",
        p_stripe_event_id: event.id,
      });
    }
  }

  return NextResponse.json({ received: true });
}
