"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  FileText,
  Lightbulb,
  Megaphone,
  MessageSquare,
  Search,
  Share2,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { LocalizedMetadata } from "@/components/i18n/LocalizedMetadata";
import { ComparisonSection, CTASection, ProblemSection, WorkflowSection } from "@/components/marketing/ConversionSections";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";

const features = [
  {
    titleKey: "home.preview.demand.title",
    labelKey: "home.preview.demand.label",
    copyKey: "home.preview.demand.body",
    outputKeys: ["home.preview.demand.output1", "home.preview.demand.output2", "home.preview.demand.output3"],
    icon: Search,
  },
  {
    titleKey: "home.preview.pair.title",
    labelKey: "home.preview.pair.label",
    copyKey: "home.preview.pair.body",
    outputKeys: ["home.preview.pair.output1", "home.preview.pair.output2", "home.preview.pair.output3"],
    icon: BarChart3,
  },
  {
    titleKey: "home.preview.evidence.title",
    labelKey: "home.preview.evidence.label",
    copyKey: "home.preview.evidence.body",
    outputKeys: ["home.preview.evidence.output1", "home.preview.evidence.output2", "home.preview.evidence.output3"],
    icon: FileText,
  },
  {
    titleKey: "home.preview.outcome.title",
    labelKey: "home.preview.outcome.label",
    copyKey: "home.preview.outcome.body",
    outputKeys: ["home.preview.outcome.output1", "home.preview.outcome.output2", "home.preview.outcome.output3"],
    icon: Sparkles,
  },
  {
    titleKey: "home.preview.review.title",
    labelKey: "home.preview.review.label",
    copyKey: "home.preview.review.body",
    outputKeys: ["home.preview.review.output1", "home.preview.review.output2", "home.preview.review.output3"],
    icon: Sparkles,
  },
] as const;

const pipeline = [
  { titleKey: "home.pipeline.demandScan", bodyKey: "home.pipeline.demandScan.body" },
  { titleKey: "home.pipeline.competitorMap", bodyKey: "home.pipeline.competitorMap.body" },
  { titleKey: "home.pipeline.adCopy", bodyKey: "home.pipeline.adCopy.body" },
  { titleKey: "home.pipeline.lpOutline", bodyKey: "home.pipeline.lpOutline.body" },
  { titleKey: "home.pipeline.marketReport", bodyKey: "home.pipeline.marketReport.body" },
] as const;

const audienceItems = [
  { titleKey: "home.audience.saas.title", bodyKey: "home.audience.saas.body", icon: Building2 },
  { titleKey: "home.audience.indie.title", bodyKey: "home.audience.indie.body", icon: Lightbulb },
  { titleKey: "home.audience.marketer.title", bodyKey: "home.audience.marketer.body", icon: Megaphone },
  { titleKey: "home.audience.operator.title", bodyKey: "home.audience.operator.body", icon: Target },
  { titleKey: "home.audience.agency.title", bodyKey: "home.audience.agency.body", icon: Users },
] as const;

const quickWorkflow = [
  { titleKey: "home.quickWorkflow.reviews", icon: MessageSquare },
  { titleKey: "home.quickWorkflow.social", icon: Share2 },
  { titleKey: "home.quickWorkflow.competitors", icon: Building2 },
  { titleKey: "home.quickWorkflow.search", icon: Search },
] as const;

const sampleResults = [
  { titleKey: "home.sample.card1.title", bodyKey: "home.sample.card1.body" },
  { titleKey: "home.sample.card2.title", bodyKey: "home.sample.card2.body" },
  { titleKey: "home.sample.card3.title", bodyKey: "home.sample.card3.body" },
] as const;

const trustItems = [
  { titleKey: "home.trust.card1.title", bodyKey: "home.trust.card1.body" },
  { titleKey: "home.trust.card2.title", bodyKey: "home.trust.card2.body" },
  { titleKey: "home.trust.card3.title", bodyKey: "home.trust.card3.body" },
  { titleKey: "home.trust.card4.title", bodyKey: "home.trust.card4.body" },
] as const;

export function HomePageClient() {
  const { t } = useI18n();

  return (
    <div>
      <LocalizedMetadata titleKey="meta.home.title" descriptionKey="meta.home.description" />
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1.2fr_0.8fr] md:px-6 md:py-20">
          <div>
            <p className="text-sm font-medium text-primary">{t("home.eyebrow")}</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">{t("home.title")}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{t("home.subtitle")}</p>
            <div className="mt-7 rounded-lg border border-border bg-background p-4">
              <div className="grid gap-3 text-sm md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
                <div className="grid grid-cols-2 gap-2">
                  {quickWorkflow.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2" key={item.titleKey}>
                        <Icon className="h-4 w-4 text-primary" />
                        <span>{t(item.titleKey)}</span>
                      </div>
                    );
                  })}
                </div>
                <ArrowRight className="hidden h-5 w-5 text-muted-foreground md:block" />
                <div className="rounded-md bg-primary px-4 py-3 text-center font-semibold text-primary-foreground">
                  {t("home.quickWorkflow.demand")}
                </div>
                <ArrowRight className="hidden h-5 w-5 text-muted-foreground md:block" />
                <div className="grid gap-2">
                  <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 font-medium">{t("home.quickWorkflow.ad")}</div>
                  <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 font-medium">{t("home.quickWorkflow.lp")}</div>
                  <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 font-medium">{t("home.quickWorkflow.product")}</div>
                </div>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/login">
                  {t("common.startFree")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/pricing">{t("common.viewPricing")}</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background p-5 shadow-panel">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              {t("home.heroCard.title")}
            </div>
            <div className="grid gap-3">
              {pipeline.map((item) => (
                <div className="rounded-md border border-border bg-card px-4 py-3" key={item.titleKey}>
                  <div className="text-sm font-medium">{t(item.titleKey)}</div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">{t(item.bodyKey)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <section className="py-20">
          <div className="grid gap-8 rounded-lg border border-border bg-card p-6 shadow-panel md:grid-cols-[0.9fr_1.1fr] md:p-8">
            <div>
              <p className="text-sm font-medium text-primary">{t("home.demo.eyebrow")}</p>
              <h2 className="mt-3 text-2xl font-semibold md:text-3xl">{t("home.demo.title")}</h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("home.demo.body")}</p>
              <div className="mt-6 rounded-md border border-border bg-background p-4">
                <div className="text-xs font-medium uppercase text-muted-foreground">{t("home.demo.inputLabel")}</div>
                <div className="mt-2 text-lg font-semibold">{t("home.demo.input")}</div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
                  <div className="text-xs font-medium uppercase text-muted-foreground">{t("home.demo.scoreLabel")}</div>
                  <div className="mt-2 text-4xl font-semibold text-primary">{t("home.demo.scoreValue")}</div>
                </div>
                <div className="rounded-md border border-border bg-card p-4">
                  <div className="text-xs font-medium uppercase text-muted-foreground">{t("home.demo.evidenceLabel")}</div>
                  <div className="mt-2 text-2xl font-semibold">{t("home.demo.evidenceValue")}</div>
                </div>
                <div className="rounded-md border border-border bg-card p-4 md:col-span-2">
                  <div className="text-xs font-medium uppercase text-muted-foreground">{t("home.demo.painLabel")}</div>
                  <div className="mt-2 font-semibold">{t("home.demo.painValue")}</div>
                </div>
                <div className="rounded-md border border-border bg-card p-4 md:col-span-2">
                  <div className="text-xs font-medium uppercase text-muted-foreground">{t("home.demo.gapLabel")}</div>
                  <div className="mt-2 font-semibold">{t("home.demo.gapValue")}</div>
                </div>
                <div className="rounded-md border border-border bg-card p-4 md:col-span-2">
                  <div className="text-xs font-medium uppercase text-muted-foreground">{t("home.demo.positioningLabel")}</div>
                  <div className="mt-2 font-semibold">{t("home.demo.positioningValue")}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="py-20">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold md:text-3xl">{t("home.audience.title")}</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">{t("home.audience.subtitle")}</p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {audienceItems.map((item) => {
              const Icon = item.icon;
              return (
                <section className="rounded-lg border border-border bg-card p-6" key={item.titleKey}>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{t(item.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(item.bodyKey)}</p>
                </section>
              );
            })}
          </div>
          <p className="mt-5 text-sm text-muted-foreground">{t("home.audience.helper")}</p>
        </section>
        <ProblemSection
          eyebrowKey="home.problem.eyebrow"
          titleKey="home.problem.title"
          bodyKey="home.problem.body"
          itemsTitleKey="home.problem.itemsTitle"
          items={[
            { titleKey: "home.problem.card1.title", bodyKey: "home.problem.card1.body" },
            { titleKey: "home.problem.card2.title", bodyKey: "home.problem.card2.body" },
            { titleKey: "home.problem.card3.title", bodyKey: "home.problem.card3.body" },
          ]}
        />
        <ProblemSection
          titleKey="home.solution.title"
          bodyKey="home.solution.body"
          noteKey="home.solution.note"
          withIcons
          items={[
            { titleKey: "home.solution.card1.title", bodyKey: "home.solution.card1.body" },
            { titleKey: "home.solution.card2.title", bodyKey: "home.solution.card2.body" },
            { titleKey: "home.solution.card3.title", bodyKey: "home.solution.card3.body" },
          ]}
        />
        <WorkflowSection
          titleKey="home.workflow.title"
          bodyKey="home.workflow.body"
          items={[
            { titleKey: "home.workflow.step1.title", bodyKey: "home.workflow.step1.body" },
            { titleKey: "home.workflow.step2.title", bodyKey: "home.workflow.step2.body" },
            { titleKey: "home.workflow.step3.title", bodyKey: "home.workflow.step3.body" },
            { titleKey: "home.workflow.step4.title", bodyKey: "home.workflow.step4.body" },
            { titleKey: "home.workflow.step5.title", bodyKey: "home.workflow.step5.body" },
          ]}
        />
      </div>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold md:text-3xl">{t("home.preview.title")}</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{t("home.preview.body")}</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {features.map((feature) => {
            const Icon = feature.icon;
            const title = t(feature.titleKey);
            const label = t(feature.labelKey);
            return (
              <div className="rounded-lg border border-border bg-card p-5" key={feature.titleKey}>
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="mt-4 text-base font-semibold">{title}</h2>
                {label !== title ? <div className="mt-1 text-xs font-medium text-primary">{label}</div> : null}
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(feature.copyKey)}</p>
                <div className="mt-5 border-t border-border pt-4">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">{t("home.preview.outputs")}</div>
                  <ul className="mt-3 grid gap-2 text-sm">
                    {feature.outputKeys.map((outputKey) => (
                      <li className="flex gap-2" key={outputKey}>
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{t(outputKey)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <section className="py-12">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold md:text-3xl">{t("home.sample.title")}</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">{t("home.sample.body")}</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {sampleResults.map((item) => (
              <section className="rounded-lg border border-border bg-card p-5" key={item.titleKey}>
                <div className="text-sm font-medium text-primary">{t(item.titleKey)}</div>
                <p className="mt-3 text-lg font-semibold leading-7">{t(item.bodyKey)}</p>
              </section>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t("home.sample.disclaimer")}</p>
        </section>
        <ComparisonSection
          titleKey="home.compare.title"
          bodyKey="home.compare.body"
          leftTitleKey="home.compare.leftTitle"
          rightTitleKey="home.compare.rightTitle"
          rows={[
            { leftKey: "home.compare.row1.left", rightKey: "home.compare.row1.right" },
            { leftKey: "home.compare.row2.left", rightKey: "home.compare.row2.right" },
            { leftKey: "home.compare.row3.left", rightKey: "home.compare.row3.right" },
          ]}
        />
        <section className="py-12">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold md:text-3xl">{t("home.trust.title")}</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {trustItems.map((item) => (
              <section className="rounded-lg border border-border bg-card p-5" key={item.titleKey}>
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h3 className="mt-4 font-semibold">{t(item.titleKey)}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(item.bodyKey)}</p>
              </section>
            ))}
          </div>
        </section>
        <CTASection titleKey="home.cta.title" bodyKey="home.cta.body" />
      </div>
    </div>
  );
}
