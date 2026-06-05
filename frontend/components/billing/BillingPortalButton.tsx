"use client";

import { Settings } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function BillingPortalButton() {
  const { t } = useI18n();

  const openPortal = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        window.location.href = "/login";
        return;
      }
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Billing portal failed.");
      if (payload.url) window.location.href = payload.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Billing portal failed.");
    }
  };

  return (
    <Button onClick={openPortal} variant="outline">
      <Settings className="mr-2 h-4 w-4" />
      {t("pricing.manageBilling")}
    </Button>
  );
}
