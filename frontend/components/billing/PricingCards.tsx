"use client";

import { Check, CreditCard } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { PLANS, formatBillingAmount, type BillingCurrency, type PlanId } from "@/lib/billing/plans";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

async function postWithSession(path: string, body?: unknown) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    window.location.href = "/login";
    return null;
  }

  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "Checkout failed.");
  }
  return payload;
}

export function PricingCards({ currency }: { currency: BillingCurrency }) {
  const { user } = useAuth();
  const { t } = useI18n();

  const startCheckout = async (planId: PlanId) => {
    if (planId === "business") {
      window.location.href = "/contact";
      return;
    }
    if (planId === "free") {
      window.location.href = user ? "/dashboard" : "/login";
      return;
    }

    try {
      const payload = await postWithSession("/api/stripe/create-checkout-session", { planId, currency });
      if (payload?.url) window.location.href = payload.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed.");
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Object.values(PLANS).map((plan) => {
        const highlighted = plan.id === "growth";
        const price = plan.prices[currency].amount;
        return (
          <Card key={plan.id} className={cn("flex flex-col", highlighted && "border-primary shadow-lg")}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{plan.name}</CardTitle>
                {highlighted ? (
                  <span className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                    {t("pricing.recommended")}
                  </span>
                ) : null}
              </div>
              <div className="pt-3">
                <span className="text-2xl font-semibold">
                  {plan.contactOnly ? t("pricing.contactSales") : formatBillingAmount(price, currency)}
                </span>
                {!plan.contactOnly ? <span className="text-sm text-muted-foreground"> {t("pricing.perMonth")}</span> : null}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{t(`pricing.plan.${plan.id}.description`)}</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <div className="space-y-3">
                {[1, 2, 3, 4].map((index) => (
                  <div className="flex gap-2 text-sm" key={index}>
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{t(`pricing.feature.${plan.id}.${index}`)}</span>
                  </div>
                ))}
              </div>
              <Button className="mt-6 w-full" onClick={() => startCheckout(plan.id)} variant={highlighted ? "default" : "outline"}>
                <CreditCard className="mr-2 h-4 w-4" />
                {plan.id === "free"
                  ? t("pricing.startFree")
                  : plan.contactOnly
                    ? t("pricing.contactSales")
                    : t("pricing.choosePlan")}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
