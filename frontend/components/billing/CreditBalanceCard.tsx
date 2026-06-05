"use client";

import { useEffect, useState } from "react";
import { WalletCards } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/hooks/use-i18n";
import { getApiBaseUrl } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type CreditBalance = {
  monthlyCredits: number;
  purchasedCredits: number;
  totalCredits: number;
  lifetimeUsedCredits: number;
};

export function CreditBalanceCard() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        const response = await fetch(`${getApiBaseUrl()}/credits/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(await response.text());
        const payload = (await response.json()) as CreditBalance;
        if (mounted) setBalance(payload);
      } catch (caught) {
        if (mounted) setError(caught instanceof Error ? caught.message : "Failed to load credits.");
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WalletCards className="h-5 w-5 text-primary" />
          {t("pricing.creditBalance")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label={t("pricing.total")} value={balance?.totalCredits} />
          <Metric label={t("pricing.monthly")} value={balance?.monthlyCredits} />
          <Metric label={t("pricing.purchased")} value={balance?.purchasedCredits} />
          <Metric label={t("pricing.lifetimeUsed")} value={balance?.lifetimeUsedCredits} />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value === undefined ? "-" : value.toLocaleString()}</div>
    </div>
  );
}
