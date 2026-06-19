export type PlanId = "free" | "starter" | "growth" | "business";
export type CreditPackId = "credits_1000" | "credits_5000" | "credits_20000";
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
    savedItemLimit: number | null;
    features: {
      pairAnalysis: boolean;
      experimentCreate: boolean;
    };
    contactOnly?: boolean;
  }
> = {
  free: {
    id: "free",
    name: "Free",
    prices: {
      jpy: { amount: 0 },
      usd: { amount: 0 },
    },
    monthlyCredits: 500,
    savedItemLimit: 10,
    features: { pairAnalysis: false, experimentCreate: false },
  },
  starter: {
    id: "starter",
    name: "Starter",
    prices: {
      jpy: { amount: 2980, stripePriceEnvKey: "STRIPE_PRICE_STARTER_MONTHLY" },
      usd: { amount: 24, stripePriceEnvKey: "STRIPE_PRICE_STARTER_MONTHLY_USD" },
    },
    monthlyCredits: 2500,
    savedItemLimit: null,
    features: { pairAnalysis: true, experimentCreate: false },
  },
  growth: {
    id: "growth",
    name: "Growth",
    prices: {
      jpy: { amount: 6980, stripePriceEnvKey: "STRIPE_PRICE_GROWTH_MONTHLY" },
      usd: { amount: 55, stripePriceEnvKey: "STRIPE_PRICE_GROWTH_MONTHLY_USD" },
    },
    monthlyCredits: 8000,
    savedItemLimit: null,
    features: { pairAnalysis: true, experimentCreate: true },
  },
  business: {
    id: "business",
    name: "Business",
    prices: {
      jpy: { amount: 0 },
      usd: { amount: 0 },
    },
    monthlyCredits: 0,
    savedItemLimit: null,
    features: { pairAnalysis: true, experimentCreate: true },
    contactOnly: true,
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
      jpy: { amount: 1980, stripePriceEnvKey: "STRIPE_PRICE_CREDIT_1000" },
      usd: { amount: 16, stripePriceEnvKey: "STRIPE_PRICE_CREDIT_1000_USD" },
    },
    credits: 1000,
  },
  credits_5000: {
    id: "credits_5000",
    name: "5,000 Credits",
    prices: {
      jpy: { amount: 7900, stripePriceEnvKey: "STRIPE_PRICE_CREDIT_5000" },
      usd: { amount: 63, stripePriceEnvKey: "STRIPE_PRICE_CREDIT_5000_USD" },
    },
    credits: 5000,
  },
  credits_20000: {
    id: "credits_20000",
    name: "20,000 Credits",
    prices: {
      jpy: { amount: 25800, stripePriceEnvKey: "STRIPE_PRICE_CREDIT_20000" },
      usd: { amount: 205, stripePriceEnvKey: "STRIPE_PRICE_CREDIT_20000_USD" },
    },
    credits: 20000,
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
