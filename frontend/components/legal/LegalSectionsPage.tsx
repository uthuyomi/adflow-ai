"use client";

import { LocalizedMetadata } from "@/components/i18n/LocalizedMetadata";
import { useI18n } from "@/hooks/use-i18n";
import type { TranslationKey } from "@/lib/i18n";

export function LegalSectionsPage({
  titleKey,
  titleMetaKey,
  descriptionMetaKey,
  sections,
}: {
  titleKey: TranslationKey;
  titleMetaKey: TranslationKey;
  descriptionMetaKey: TranslationKey;
  sections: { titleKey: TranslationKey; bodyKey: TranslationKey }[];
}) {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <LocalizedMetadata titleKey={titleMetaKey} descriptionKey={descriptionMetaKey} />
      <h1 className="text-3xl font-semibold">{t(titleKey)}</h1>
      <div className="mt-8 space-y-5">
        {sections.map((section) => (
          <section className="rounded-lg border border-border bg-card p-5" key={section.titleKey}>
            <h2 className="font-semibold">{t(section.titleKey)}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(section.bodyKey)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

export function LegalTablePage({
  titleKey,
  titleMetaKey,
  descriptionMetaKey,
  rows,
}: {
  titleKey: TranslationKey;
  titleMetaKey: TranslationKey;
  descriptionMetaKey: TranslationKey;
  rows: { labelKey: TranslationKey; valueKey: TranslationKey }[];
}) {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <LocalizedMetadata titleKey={titleMetaKey} descriptionKey={descriptionMetaKey} />
      <h1 className="text-3xl font-semibold">{t(titleKey)}</h1>
      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-card">
        {rows.map((row) => (
          <div className="grid gap-2 border-b border-border p-4 last:border-b-0 md:grid-cols-[220px_1fr]" key={row.labelKey}>
            <div className="font-medium">{t(row.labelKey)}</div>
            <div className="text-sm leading-6 text-muted-foreground">{t(row.valueKey)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
