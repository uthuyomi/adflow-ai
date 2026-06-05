"use client";

import { Coins } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/hooks/use-i18n";
import { CREDIT_PACKS, formatBillingAmount, type BillingCurrency, type CreditPackId } from "@/lib/billing/plans";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function CreditPackCards({ currency }: { currency: BillingCurrency }) {
  const { t } = useI18n();

  const buyPack = async (packId: CreditPackId) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/stripe/create-credit-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packId, currency }),
      });
      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Checkout failed.");
      if (payload.url) window.location.href = payload.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed.");
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Object.values(CREDIT_PACKS).map((pack) => {
        const price = pack.prices[currency].amount;
        return (
          <Card key={pack.id}>
            <CardHeader>
              <CardTitle>{pack.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {pack.credits.toLocaleString()} {t("pricing.packNoExpire")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatBillingAmount(price, currency)}</div>
              <Button className="mt-5 w-full" onClick={() => buyPack(pack.id)} variant="outline">
                <Coins className="mr-2 h-4 w-4" />
                {t("pricing.buyCredits")}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
