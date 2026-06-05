"use client";

import type { ReactNode } from "react";

import { LocalizedMetadata } from "@/components/i18n/LocalizedMetadata";
import { useI18n } from "@/hooks/use-i18n";
import type { TranslationKey } from "@/lib/i18n";

export function MarketingInfoPage({
  eyebrowKey,
  titleKey,
  subtitleKey,
  titleMetaKey,
  descriptionMetaKey,
  children,
}: {
  eyebrowKey: TranslationKey;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  titleMetaKey: TranslationKey;
  descriptionMetaKey: TranslationKey;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <LocalizedMetadata titleKey={titleMetaKey} descriptionKey={descriptionMetaKey} />
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-primary">{t(eyebrowKey)}</p>
        <h1 className="mt-3 text-3xl font-semibold">{t(titleKey)}</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">{t(subtitleKey)}</p>
      </div>
      {children}
    </div>
  );
}

export function InfoGrid({ items }: { items: { titleKey: TranslationKey; bodyKey: TranslationKey }[] }) {
  const { t } = useI18n();

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <section className="rounded-lg border border-border bg-card p-5" key={item.titleKey}>
          <h2 className="font-semibold">{t(item.titleKey)}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(item.bodyKey)}</p>
        </section>
      ))}
    </div>
  );
}
