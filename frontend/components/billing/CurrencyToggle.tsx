"use client";

import type { BillingCurrency } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";

export function CurrencyToggle({
  currency,
  onChange,
}: {
  currency: BillingCurrency;
  onChange: (currency: BillingCurrency) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="inline-flex rounded-md border border-border bg-card p-1">
      {[
        { value: "jpy" as const, label: t("pricing.currency.jpy") },
        { value: "usd" as const, label: t("pricing.currency.usd") },
      ].map((option) => (
        <button
          className={cn(
            "h-9 rounded px-3 text-sm font-medium text-muted-foreground transition-colors",
            currency === option.value && "bg-primary text-primary-foreground",
          )}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
