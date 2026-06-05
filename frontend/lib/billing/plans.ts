export type PlanId = "free" | "starter" | "pro" | "business";
export type CreditPackId = "credits_1000" | "credits_5000" | "credits_20000" | "credits_50000";
export type BillingCurrency = "jpy" | "usd";

type CurrencyPrice = {
  amount: number;
  stripePriceEnvKey?: string;
};

export const PLANS: Record<
  PlanId,
  {
    id: PlanId;
    name: string;
    prices: Record<BillingCurrency, CurrencyPrice>;
    monthlyCredits: number;
  }
> = {
  free: {
    id: "free",
    name: "Free",
    prices: {
      jpy: { amount: 0 },
      usd: { amount: 0 },
    },
    monthlyCredits: 100,
  },
  starter: {
    id: "starter",
    name: "Starter",
    prices: {
      jpy: { amount: 4980, stripePriceEnvKey: "STRIPE_PRICE_STARTER_MONTHLY" },
      usd: { amount: 39, stripePriceEnvKey: "STRIPE_PRICE_STARTER_MONTHLY_USD" },
    },
    monthlyCredits: 3000,
  },
  pro: {
    id: "pro",
    name: "Pro",
    prices: {
      jpy: { amount: 14800, stripePriceEnvKey: "STRIPE_PRICE_PRO_MONTHLY" },
      usd: { amount: 119, stripePriceEnvKey: "STRIPE_PRICE_PRO_MONTHLY_USD" },
    },
    monthlyCredits: 12000,
  },
  business: {
    id: "business",
    name: "Business",
    prices: {
      jpy: { amount: 49800, stripePriceEnvKey: "STRIPE_PRICE_BUSINESS_MONTHLY" },
      usd: { amount: 399, stripePriceEnvKey: "STRIPE_PRICE_BUSINESS_MONTHLY_USD" },
    },
    monthlyCredits: 50000,
  },
};

export const CREDIT_PACKS: Record<
  CreditPackId,
  {
    id: CreditPackId;
    name: string;
    prices: Record<BillingCurrency, CurrencyPrice>;
    credits: number;
  }
> = {
  credits_1000: {
    id: "credits_1000",
    name: "1,000 Credits",
    prices: {
      jpy: { amount: 1000, stripePriceEnvKey: "STRIPE_PRICE_CREDIT_1000" },
      usd: { amount: 8, stripePriceEnvKey: "STRIPE_PRICE_CREDIT_1000_USD" },
    },
    credits: 1000,
  },
  credits_5000: {
    id: "credits_5000",
    name: "5,000 Credits",
    prices: {
      jpy: { amount: 4500, stripePriceEnvKey: "STRIPE_PRICE_CREDIT_5000" },
      usd: { amount: 36, stripePriceEnvKey: "STRIPE_PRICE_CREDIT_5000_USD" },
    },
    credits: 5000,
  },
  credits_20000: {
    id: "credits_20000",
    name: "20,000 Credits",
    prices: {
      jpy: { amount: 16000, stripePriceEnvKey: "STRIPE_PRICE_CREDIT_20000" },
      usd: { amount: 129, stripePriceEnvKey: "STRIPE_PRICE_CREDIT_20000_USD" },
    },
    credits: 20000,
  },
  credits_50000: {
    id: "credits_50000",
    name: "50,000 Credits",
    prices: {
      jpy: { amount: 35000, stripePriceEnvKey: "STRIPE_PRICE_CREDIT_50000" },
      usd: { amount: 279, stripePriceEnvKey: "STRIPE_PRICE_CREDIT_50000_USD" },
    },
    credits: 50000,
  },
};

export const CREDIT_COSTS = {
  LIGHT_DEMAND_SCAN: 20,
  DEMAND_ANALYSIS: 50,
  COMPETITOR_ANALYSIS: 80,
  SOURCE_SUMMARY: 80,
  AD_COPY_GENERATION: 40,
  LP_OUTLINE_GENERATION: 100,
  PRODUCT_IDEA_CONVERSION: 120,
  MARKET_REPORT: 200,
  FULL_ANALYSIS_PACK: 300,
} as const;

export function formatBillingAmount(amount: number, currency: BillingCurrency) {
  return new Intl.NumberFormat(currency === "jpy" ? "ja-JP" : "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getPriceEnvKey(item: { prices: Record<BillingCurrency, CurrencyPrice> }, currency: BillingCurrency) {
  return item.prices[currency].stripePriceEnvKey;
}
