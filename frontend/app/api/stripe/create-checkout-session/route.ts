import { NextResponse } from "next/server";

import { getPriceEnvKey, PLANS, type BillingCurrency, type PlanId } from "@/lib/billing/plans";
import { getAppUrl, getStripe } from "@/lib/stripe/server";
import { getSupabaseAdminClient, getUserFromBearerToken } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, error } = await getUserFromBearerToken(request);
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { currency?: BillingCurrency; planId?: PlanId } | null;
  const currency = body?.currency === "usd" ? "usd" : "jpy";
  const plan = body?.planId ? PLANS[body.planId] : null;
  const priceEnvKey = plan ? getPriceEnvKey(plan, currency) : undefined;
  if (!plan || plan.id === "free" || !priceEnvKey) {
    return NextResponse.json({ error: "Invalid subscription plan." }, { status: 400 });
  }

  const price = process.env[priceEnvKey];
  if (!price) {
    return NextResponse.json({ error: `${priceEnvKey} is required.` }, { status: 500 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: profile } = await supabase
    .from("user_billing_profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const stripe = getStripe();
  let customerId = profile?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await supabase.from("user_billing_profiles").upsert(
      {
        user_id: user.id,
        stripe_customer_id: customerId,
        plan: "free",
        subscription_status: "inactive",
      },
      { onConflict: "user_id" },
    );
  }

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing?canceled=1`,
    metadata: {
      userId: user.id,
      planId: plan.id,
      currency,
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        planId: plan.id,
        currency,
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
