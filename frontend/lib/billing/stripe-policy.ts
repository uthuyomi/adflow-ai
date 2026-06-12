export function isCompletedCheckoutSession(session: { status?: string | null } | null | undefined) {
  return session?.status === "complete";
}

export function refundedCredits(totalCredits: number, amountRefunded: number, amountTotal: number) {
  if (totalCredits <= 0 || amountRefunded <= 0 || amountTotal <= 0) return 0;
  return Math.min(totalCredits, Math.max(1, Math.round(totalCredits * (amountRefunded / amountTotal))));
}

export function isHandledBillingEvent(type: string) {
  return [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
    "charge.refunded",
  ].includes(type);
}
