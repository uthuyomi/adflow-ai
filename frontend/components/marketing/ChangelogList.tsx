"use client";

import { useI18n } from "@/hooks/use-i18n";

const entries = [
  {
    version: "v2.0",
    date: "2026-06-04",
    titleKey: "changelog.billing.title",
    changeKey: "changelog.billing.copy",
    impactKey: "changelog.billing.impact",
  },
  {
    version: "v1.8",
    date: "2026-05-28",
    titleKey: "changelog.demand.title",
    changeKey: "changelog.demand.copy",
    impactKey: "changelog.demand.impact",
  },
  {
    version: "v1.7",
    date: "2026-05-28",
    titleKey: "changelog.i18n.title",
    changeKey: "changelog.i18n.copy",
    impactKey: "changelog.i18n.impact",
  },
] as const;

export function ChangelogList() {
  const { t } = useI18n();

  return (
    <div className="mt-8 grid gap-4">
      {entries.map((entry) => (
        <section className="rounded-lg border border-border bg-card p-5" key={entry.titleKey}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t(entry.titleKey)}</h2>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-md border border-border px-2 py-1">
                {t("changelog.version")}: {entry.version}
              </span>
              <span className="rounded-md border border-border px-2 py-1">
                {t("changelog.date")}: {entry.date}
              </span>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">{t("changelog.changes")}</div>
              <p className="mt-2 text-sm leading-6">{t(entry.changeKey)}</p>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">{t("changelog.impact")}</div>
              <p className="mt-2 text-sm leading-6">{t(entry.impactKey)}</p>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
