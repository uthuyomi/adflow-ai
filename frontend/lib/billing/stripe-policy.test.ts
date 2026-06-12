import assert from "node:assert/strict";
import test from "node:test";

import { isCompletedCheckoutSession, isHandledBillingEvent, refundedCredits } from "./stripe-policy.ts";

test("billing success requires a complete Checkout Session", () => {
  assert.equal(isCompletedCheckoutSession({ status: "complete" }), true);
  assert.equal(isCompletedCheckoutSession({ status: "open" }), false);
  assert.equal(isCompletedCheckoutSession({ status: "expired" }), false);
  assert.equal(isCompletedCheckoutSession(null), false);
});

test("refund credits follow full and partial Stripe refunds", () => {
  assert.equal(refundedCredits(1000, 1000, 1000), 1000);
  assert.equal(refundedCredits(1000, 250, 1000), 250);
  assert.equal(refundedCredits(1000, 0, 1000), 0);
});

test("success, failure, refund, and cancellation events are handled", () => {
  assert.equal(isHandledBillingEvent("checkout.session.completed"), true);
  assert.equal(isHandledBillingEvent("invoice.payment_failed"), true);
  assert.equal(isHandledBillingEvent("charge.refunded"), true);
  assert.equal(isHandledBillingEvent("customer.subscription.deleted"), true);
  assert.equal(isHandledBillingEvent("unrelated.event"), false);
});
