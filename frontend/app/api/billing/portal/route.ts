import { NextResponse } from "next/server";

import { getAppUrl, getStripe } from "@/lib/stripe/server";
import { getSupabaseAdminClient, getUserFromBearerToken } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, error } = await getUserFromBearerToken(request);
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: profile } = await supabase
    .from("user_billing_profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "Stripe customer is not available." }, { status: 400 });
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${getAppUrl()}/pricing`,
  });

  return NextResponse.json({ url: session.url });
}
