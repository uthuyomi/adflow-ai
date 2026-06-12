import { BillingResultPage } from "@/components/billing/BillingResultPage";
import { isCompletedCheckoutSession } from "@/lib/billing/stripe-policy";
import { getStripe } from "@/lib/stripe/server";

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  if (!sessionId) {
    return <BillingResultPage status="failed" detail="Stripe Checkout Session ID is missing." />;
  }
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (!isCompletedCheckoutSession(session)) {
      return <BillingResultPage status="failed" detail={`Checkout status: ${session.status ?? "unknown"}`} />;
    }
    return <BillingResultPage status="success" />;
  } catch {
    return <BillingResultPage status="failed" detail="Stripe could not verify this Checkout Session." />;
  }
}
