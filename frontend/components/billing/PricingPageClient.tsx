"use client";

import { BillingPortalButton } from "@/components/billing/BillingPortalButton";
import { CreditBalanceCard } from "@/components/billing/CreditBalanceCard";
import { CreditPackCards } from "@/components/billing/CreditPackCards";
import { CurrencyToggle } from "@/components/billing/CurrencyToggle";
import { PricingCards } from "@/components/billing/PricingCards";
import { LocalizedMetadata } from "@/components/i18n/LocalizedMetadata";
import { CTASection, FAQSection } from "@/components/marketing/ConversionSections";
import { useBillingCurrency } from "@/hooks/use-billing-currency";
import { useI18n } from "@/hooks/use-i18n";

const creditUsage = [
  { key: "pricing.usage.demand", credits: 50 },
  { key: "pricing.usage.pair", credits: 80 },
  { key: "pricing.usage.fit", credits: 120 },
  { key: "pricing.usage.workflow", credits: 300 },
] as const;

const comparisonRows = [
  ["pricing.table.demand", "pricing.table.limited", "pricing.table.included", "pricing.table.included", "pricing.table.included"],
  ["pricing.table.competitor", "pricing.table.notIncluded", "pricing.table.basic", "pricing.table.included", "pricing.table.advanced"],
  ["pricing.table.pair", "pricing.table.notIncluded", "pricing.table.basic", "pricing.table.included", "pricing.table.advanced"],
  ["pricing.table.outcome", "pricing.table.notIncluded", "pricing.table.basic", "pricing.table.included", "pricing.table.advanced"],
  ["pricing.table.exports", "pricing.table.notIncluded", "pricing.table.notIncluded", "pricing.table.included", "pricing.table.included"],
  ["pricing.table.priority", "pricing.table.notIncluded", "pricing.table.notIncluded", "pricing.table.basic", "pricing.table.included"],
  ["pricing.table.team", "pricing.table.notIncluded", "pricing.table.notIncluded", "pricing.table.limited", "pricing.table.included"],
] as const;

export function PricingPageClient() {
  const { currency, setCurrency } = useBillingCurrency();
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <LocalizedMetadata titleKey="meta.pricing.title" descriptionKey="meta.pricing.description" />
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-primary">{t("pricing.eyebrow")}</p>
          <h1 className="mt-3 text-3xl font-semibold">{t("pricing.title")}</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{t("pricing.subtitle")}</p>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <CurrencyToggle currency={currency} onChange={setCurrency} />
          <BillingPortalButton />
        </div>
      </div>

      <div className="mt-8">
        <CreditBalanceCard />
      </div>

      <section className="mt-10 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">{t("pricing.usage.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("pricing.usage.body")}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {creditUsage.map((item) => (
              <div className="rounded-md border border-border bg-background p-4" key={item.key}>
                <div className="text-sm text-muted-foreground">{t(item.key)}</div>
                <div className="mt-2 text-2xl font-semibold">{item.credits}</div>
                <div className="text-xs text-muted-foreground">credits</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">{t("pricing.roi.title")}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("pricing.roi.body")}</p>
        </div>
      </section>

      <section className="mt-8">
        <PricingCards currency={currency} />
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">{t("pricing.table.title")}</h2>
        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[1.2fr_repeat(4,1fr)] bg-muted text-sm font-semibold">
            <div className="p-3">{t("pricing.table.feature")}</div>
            <div className="p-3">Free</div>
            <div className="p-3">Starter</div>
            <div className="p-3">Growth</div>
            <div className="p-3">Business</div>
          </div>
          {comparisonRows.map((row) => (
            <div className="grid grid-cols-[1.2fr_repeat(4,1fr)] border-t border-border text-sm" key={row[0]}>
              {row.map((cell, index) => (
                <div className={index === 0 ? "p-3 font-medium" : "p-3 text-muted-foreground"} key={`${row[0]}-${cell}`}>
                  {t(cell)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">{t("pricing.additionalCredits")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("pricing.packsNote")}</p>
        <div className="mt-5">
          <CreditPackCards currency={currency} />
        </div>
      </section>

      <FAQSection
        titleKey="faq.eyebrow"
        items={[
          { questionKey: "pricing.faq.credits.q", answerKey: "pricing.faq.credits.a" },
          { questionKey: "pricing.faq.rollover.q", answerKey: "pricing.faq.rollover.a" },
          { questionKey: "pricing.faq.currency.q", answerKey: "pricing.faq.currency.a" },
          { questionKey: "pricing.faq.cancel.q", answerKey: "pricing.faq.cancel.a" },
          { questionKey: "pricing.faq.reflect.q", answerKey: "pricing.faq.reflect.a" },
          { questionKey: "pricing.faq.shared.q", answerKey: "pricing.faq.shared.a" },
          { questionKey: "pricing.faq.upgrade.q", answerKey: "pricing.faq.upgrade.a" },
          { questionKey: "pricing.faq.expire.q", answerKey: "pricing.faq.expire.a" },
        ]}
      />
      <CTASection titleKey="home.cta.title" bodyKey="home.cta.body" />
    </div>
  );
}
