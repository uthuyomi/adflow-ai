import { NextResponse } from "next/server";

import { CREDIT_PACKS, getPriceEnvKey, type BillingCurrency, type CreditPackId } from "@/lib/billing/plans";
import { getAppUrl, getStripe } from "@/lib/stripe/server";
import { getSupabaseAdminClient, getUserFromBearerToken } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, error } = await getUserFromBearerToken(request);
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { currency?: BillingCurrency; packId?: CreditPackId } | null;
  const currency = body?.currency === "usd" ? "usd" : "jpy";
  const pack = body?.packId ? CREDIT_PACKS[body.packId] : null;
  if (!pack) {
    return NextResponse.json({ error: "Invalid credit pack." }, { status: 400 });
  }

  const priceEnvKey = getPriceEnvKey(pack, currency);
  if (!priceEnvKey) {
    return NextResponse.json({ error: "Invalid credit pack currency." }, { status: 400 });
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
    const { error: profileError } = await supabase.from("user_billing_profiles").upsert(
      {
        user_id: user.id,
        stripe_customer_id: customerId,
        plan: "free",
        subscription_status: "inactive",
      },
      { onConflict: "user_id" },
    );
    if (profileError) throw new Error(`Unable to save Stripe customer: ${profileError.message}`);
  }

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing?canceled=1`,
    metadata: {
      userId: user.id,
      packId: pack.id,
      credits: String(pack.credits),
      currency,
    },
  });

  return NextResponse.json({ url: session.url });
}
