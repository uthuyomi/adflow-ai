"use client";

import Link from "next/link";

import { useI18n } from "@/hooks/use-i18n";

export function PublicFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 text-sm text-muted-foreground md:grid-cols-[1fr_auto_auto] md:px-6">
        <div>
          <div className="font-semibold text-foreground">{t("common.brand")}</div>
          <div className="mt-2">{t("footer.rights")}</div>
        </div>
        <div className="grid gap-2">
          <div className="font-medium text-foreground">{t("footer.product")}</div>
          <Link href="/features">{t("nav.features")}</Link>
          <Link href="/how-it-works">{t("nav.howItWorks")}</Link>
          <Link href="/compare">{t("nav.compare")}</Link>
          <Link href="/why-adflow">{t("nav.whyAdflow")}</Link>
          <Link href="/use-cases">{t("nav.useCases")}</Link>
          <Link href="/pricing">{t("nav.pricing")}</Link>
          <Link href="/faq">{t("nav.faq")}</Link>
          <Link href="/contact">{t("nav.contact")}</Link>
        </div>
        <div className="grid gap-2">
          <div className="font-medium text-foreground">{t("footer.legal")}</div>
          <Link href="/terms">{t("footer.terms")}</Link>
          <Link href="/privacy">{t("footer.privacy")}</Link>
          <Link href="/legal">{t("footer.legalPage")}</Link>
          <Link href="/legal/tokusho">{t("footer.tokusho")}</Link>
        </div>
      </div>
    </footer>
  );
}
