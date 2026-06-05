"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import type { TranslationKey } from "@/lib/i18n";

type CopyItem = {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
};

type WorkflowItem = CopyItem & {
  labelKey?: TranslationKey;
};

export function ProblemSection({
  eyebrowKey,
  titleKey,
  bodyKey,
  itemsTitleKey,
  items,
  noteKey,
  withIcons = false,
}: {
  eyebrowKey?: TranslationKey;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  itemsTitleKey?: TranslationKey;
  items?: CopyItem[];
  noteKey?: TranslationKey;
  withIcons?: boolean;
}) {
  const { t } = useI18n();

  return (
    <section className="py-12">
      <div className="max-w-3xl">
        {eyebrowKey ? <p className="text-sm font-medium text-primary">{t(eyebrowKey)}</p> : null}
        <h2 className="mt-3 text-2xl font-semibold md:text-3xl">{t(titleKey)}</h2>
        <p className="mt-4 text-base leading-7 text-muted-foreground">{t(bodyKey)}</p>
      </div>
      {items?.length ? (
        <>
          {itemsTitleKey ? <h3 className="mt-10 text-sm font-semibold uppercase text-muted-foreground">{t(itemsTitleKey)}</h3> : null}
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {items.map((item, index) => (
              <section
                className="rounded-lg border border-border bg-card p-5 first:border-primary/40 first:bg-primary/5 first:shadow-panel"
                key={item.titleKey}
              >
                {withIcons ? (
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                ) : null}
                <h3 className={index === 0 ? "text-lg font-semibold" : "font-semibold"}>{t(item.titleKey)}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(item.bodyKey)}</p>
              </section>
            ))}
          </div>
          {noteKey ? <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">{t(noteKey)}</p> : null}
        </>
      ) : null}
    </section>
  );
}

export function WorkflowSection({
  eyebrowKey,
  titleKey,
  bodyKey,
  items,
}: {
  eyebrowKey?: TranslationKey;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  items: WorkflowItem[];
}) {
  const { t } = useI18n();

  return (
    <section className="border-y border-border py-12">
      <div className="max-w-3xl">
        {eyebrowKey ? <p className="text-sm font-medium text-primary">{t(eyebrowKey)}</p> : null}
        <h2 className="mt-3 text-2xl font-semibold md:text-3xl">{t(titleKey)}</h2>
        <p className="mt-4 text-base leading-7 text-muted-foreground">{t(bodyKey)}</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-5">
        {items.map((item, index) => (
          <section
            className="relative min-h-[220px] rounded-lg border border-border bg-card p-5 first:border-primary/40 first:bg-primary/5"
            key={item.titleKey}
          >
            {index < items.length - 1 ? (
              <ArrowRight className="pointer-events-none absolute -right-5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground md:block" />
            ) : null}
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              {index + 1}
            </div>
            {item.labelKey ? <p className="mt-4 text-xs font-medium uppercase text-muted-foreground">{t(item.labelKey)}</p> : null}
            <h3 className="mt-3 font-semibold">{t(item.titleKey)}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(item.bodyKey)}</p>
          </section>
        ))}
      </div>
    </section>
  );
}

export function ComparisonSection({
  titleKey,
  bodyKey,
  leftTitleKey,
  rightTitleKey,
  rows,
}: {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  leftTitleKey: TranslationKey;
  rightTitleKey: TranslationKey;
  rows: { leftKey: TranslationKey; rightKey: TranslationKey }[];
}) {
  const { t } = useI18n();

  return (
    <section className="py-12">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold md:text-3xl">{t(titleKey)}</h2>
        <p className="mt-4 text-base leading-7 text-muted-foreground">{t(bodyKey)}</p>
      </div>
      <div className="mt-8 overflow-hidden rounded-lg border border-border">
        <div className="grid bg-muted text-sm font-semibold md:grid-cols-2">
          <div className="border-b border-border p-4 md:border-b-0 md:border-r">{t(leftTitleKey)}</div>
          <div className="bg-primary/10 p-4 text-primary">{t(rightTitleKey)}</div>
        </div>
        {rows.map((row) => (
          <div className="grid border-t border-border text-sm md:grid-cols-2" key={row.leftKey}>
            <div className="flex gap-3 p-4 text-muted-foreground md:border-r md:border-border">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>{t(row.leftKey)}</span>
            </div>
            <div className="flex gap-3 bg-primary/5 p-4 font-medium">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{t(row.rightKey)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FAQSection({
  titleKey,
  bodyKey,
  items,
}: {
  titleKey: TranslationKey;
  bodyKey?: TranslationKey;
  items: { questionKey: TranslationKey; answerKey: TranslationKey }[];
}) {
  const { t } = useI18n();

  return (
    <section className="py-12">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold md:text-3xl">{t(titleKey)}</h2>
        {bodyKey ? <p className="mt-4 text-base leading-7 text-muted-foreground">{t(bodyKey)}</p> : null}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <section className="rounded-lg border border-border bg-card p-5" key={item.questionKey}>
            <h3 className="font-semibold">{t(item.questionKey)}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(item.answerKey)}</p>
          </section>
        ))}
      </div>
    </section>
  );
}

export function CTASection({
  titleKey,
  bodyKey,
  primaryHref = "/login",
  secondaryHref = "/pricing",
}: {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  primaryHref?: string;
  secondaryHref?: string;
}) {
  const { t } = useI18n();

  return (
    <section className="py-12">
      <div className="rounded-lg border border-border bg-card p-6 md:p-8">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold md:text-3xl">{t(titleKey)}</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{t(bodyKey)}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={primaryHref}>
              {t("common.startFree")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={secondaryHref}>{t("common.viewPricing")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function FeatureDeepDiveSection({
  items,
}: {
  items: {
    titleKey: TranslationKey;
    problemKey: TranslationKey;
    doesKey: TranslationKey;
    outputKey: TranslationKey;
    benefitKey: TranslationKey;
    exampleKey: TranslationKey;
  }[];
}) {
  const { t } = useI18n();

  return (
    <section className="py-12">
      <div className="grid gap-5">
        {items.map((item) => (
          <section className="rounded-lg border border-border bg-card p-5" key={item.titleKey}>
            <h2 className="text-xl font-semibold">{t(item.titleKey)}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-5">
              <DeepDiveCell labelKey="marketing.problem" valueKey={item.problemKey} />
              <DeepDiveCell labelKey="marketing.whatItDoes" valueKey={item.doesKey} />
              <DeepDiveCell labelKey="marketing.output" valueKey={item.outputKey} />
              <DeepDiveCell labelKey="marketing.benefit" valueKey={item.benefitKey} />
              <DeepDiveCell labelKey="marketing.example" valueKey={item.exampleKey} />
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function DeepDiveCell({ labelKey, valueKey }: { labelKey: TranslationKey; valueKey: TranslationKey }) {
  const { t } = useI18n();

  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="text-xs font-medium uppercase text-muted-foreground">{t(labelKey)}</div>
      <p className="mt-2 text-sm leading-6">{t(valueKey)}</p>
    </div>
  );
}
