import { CREDIT_PACKS, PLANS, type BillingCurrency, type CreditPackId, type PlanId } from "@/lib/billing/plans";

const currencies = ["jpy", "usd"] satisfies BillingCurrency[];

export function planFromStripePrice(priceId?: string | null): PlanId | null {
  if (!priceId) return null;
  for (const plan of Object.values(PLANS)) {
    for (const currency of currencies) {
      const envKey = plan.prices[currency].stripePriceEnvKey;
      if (envKey && process.env[envKey] === priceId) return plan.id;
    }
  }
  return null;
}

export function creditPackFromStripePrice(priceId?: string | null): (typeof CREDIT_PACKS)[CreditPackId] | null {
  if (!priceId) return null;
  for (const pack of Object.values(CREDIT_PACKS)) {
    for (const currency of currencies) {
      const envKey = pack.prices[currency].stripePriceEnvKey;
      if (envKey && process.env[envKey] === priceId) return pack;
    }
  }
  return null;
}
