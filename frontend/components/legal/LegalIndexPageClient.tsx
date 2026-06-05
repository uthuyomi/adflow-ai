"use client";

import Link from "next/link";

import { LocalizedMetadata } from "@/components/i18n/LocalizedMetadata";
import { useI18n } from "@/hooks/use-i18n";

const links = [
  { href: "/terms", labelKey: "legal.terms.title" },
  { href: "/privacy", labelKey: "legal.privacy.title" },
  { href: "/legal/tokusho", labelKey: "legal.tokusho.title" },
] as const;

export function LegalIndexPageClient() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <LocalizedMetadata titleKey="meta.legal.title" descriptionKey="meta.legal.description" />
      <h1 className="text-3xl font-semibold">{t("legal.index.title")}</h1>
      <p className="mt-4 text-base leading-7 text-muted-foreground">{t("legal.index.subtitle")}</p>
      <div className="mt-8 grid gap-4">
        {links.map((link) => (
          <Link className="rounded-lg border border-border bg-card p-5 font-medium hover:bg-accent" href={link.href} key={link.href}>
            {t(link.labelKey)}
          </Link>
        ))}
      </div>
      <section className="mt-8 rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold">{t("legal.disclaimer.title")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("legal.disclaimer.copy")}</p>
      </section>
    </div>
  );
}
