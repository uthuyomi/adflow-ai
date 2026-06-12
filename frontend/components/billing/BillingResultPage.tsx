"use client";

import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { LocalizedMetadata } from "@/components/i18n/LocalizedMetadata";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";

export function BillingResultPage({ status, detail }: { status: "success" | "cancel" | "failed"; detail?: string }) {
  const { t } = useI18n();
  const success = status === "success";
  const Icon = success ? CheckCircle2 : XCircle;

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center md:px-6">
      <LocalizedMetadata titleKey="meta.pricing.title" descriptionKey="meta.pricing.description" />
      <Icon className={success ? "h-12 w-12 text-emerald-600" : "h-12 w-12 text-destructive"} />
      <h1 className="mt-5 text-3xl font-semibold">
        {status === "failed" ? "Payment could not be verified" : t(success ? "billing.success.title" : "billing.cancel.title")}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        {status === "failed" ? "No successful payment is shown until Stripe reports a complete Checkout Session." : t(success ? "billing.success.copy" : "billing.cancel.copy")}
      </p>
      {detail ? <p className="mt-2 text-xs text-muted-foreground">{detail}</p> : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {success ? (
          <Button asChild>
            <Link href="/dashboard">{t("common.goDashboard")}</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href="/pricing">{t("common.backToPricing")}</Link>
        </Button>
      </div>
    </div>
  );
}
