"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ClipboardCheck,
  GitPullRequest,
  Layers3,
  LineChart,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { LocalizedMetadata } from "@/components/i18n/LocalizedMetadata";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/hooks/use-i18n";
import { formatBillingAmount, PLANS, type PlanId } from "@/lib/billing/plans";
import { lp, type LpCopy } from "@/lib/i18n/lp";
import { cn } from "@/lib/utils";

const planIds = ["free", "starter", "growth"] as const satisfies readonly PlanId[];

export function HomePageClient() {
  const { locale } = useI18n();
  const c = lp[locale];

  return (
    <main className="bg-white text-[#111827]">
      <LocalizedMetadata titleKey="meta.home.title" descriptionKey="meta.home.description" />
      <HeroSection c={c} />
      <ProblemSection c={c} />
      <SolutionSection c={c} />
      <PairAnalysisSection c={c} />
      <EvidenceSection c={c} />
      <ImprovementSection c={c} />
      <ExecutionSection c={c} />
      <OutcomesSection c={c} />
      <RetentionSection c={c} />
      <TeamsSection c={c} />
      <ComparisonSection c={c} />
      <ProductScreensSection c={c} />
      <PricingSection c={c} locale={locale} />
      <FaqSection c={c} />
      <FinalCtaSection c={c} />
    </main>
  );
}

function HeroSection({ c }: { c: LpCopy }) {
  return (
    <section className="border-b border-[#E5E7EB] bg-white" id="hero">
      <div className="mx-auto grid min-h-[760px] max-w-[1440px] gap-12 px-6 py-20 md:px-8 lg:grid-cols-[45%_55%] lg:items-center lg:py-24">
        <div>
          <SectionLabel>{c.hero.label}</SectionLabel>
          <h1 className="mt-6 max-w-2xl whitespace-pre-line text-5xl font-bold leading-[1.05] tracking-[-0.045em] text-[#111827] md:text-[64px]">
            {c.hero.headline}
          </h1>
          <p className="mt-7 max-w-xl whitespace-pre-line text-lg leading-[1.7] text-[#6B7280]">
            {c.hero.subheadline}
          </p>
          <div className="mt-9 grid gap-3 sm:flex">
            <Button asChild className="h-12 rounded-xl bg-[#2563EB] px-6 text-white hover:bg-[#1D4ED8]">
              <Link href="/login">
                {c.common.start}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild className="h-12 rounded-xl border-[#E5E7EB] px-6 text-[#111827]" variant="outline">
              <Link href="#product">{c.common.demo}</Link>
            </Button>
          </div>
          <p className="mt-5 text-sm text-[#6B7280]">{c.hero.trust}</p>
        </div>
        <ProductHeroVisual c={c} />
      </div>
    </section>
  );
}

function ProductHeroVisual({ c }: { c: LpCopy }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-5">
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
          <div>
            <p className="text-sm font-semibold text-[#111827]">{c.hero.visualTitle}</p>
            <p className="mt-1 text-xs text-[#6B7280]">Project / Campaign / Landing Page</p>
          </div>
          <Badge className="bg-[#16A34A] text-white hover:bg-[#16A34A]">Live workspace</Badge>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <CardBlock title={c.hero.visualItems[0]} value="82%" helper="Message, offer, audience, CTA" icon={<BarChart3 className="h-4 w-4" />} />
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">{c.hero.visualItems[1]}</p>
              <span className="rounded-full bg-[#EFF6FF] px-2 py-1 text-xs font-medium text-[#2563EB]">APPLY_READY</span>
            </div>
            <div className="space-y-3">
              {[
                ["Hero CTA mismatch", "Review AI"],
                ["Competitor proof gap", "Human Approval"],
                ["Pricing section clarity", "Outcome"],
              ].map(([title, state]) => (
                <div className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2" key={title}>
                  <span className="text-sm font-medium">{title}</span>
                  <span className="text-xs text-[#6B7280]">{state}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-sm font-semibold">{c.hero.visualItems[3]}</p>
            <div className="mt-3 space-y-2">
              {["Review search", "Competitor page", "X Ads metrics"].map((item) => (
                <div className="flex items-center gap-2 text-sm text-[#6B7280]" key={item}>
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CardBlock title={c.hero.visualItems[2]} value="7" helper="Measured changes" icon={<LineChart className="h-4 w-4" />} />
            <CardBlock title={c.hero.visualItems[4]} value="18" helper="Reusable learnings" icon={<Layers3 className="h-4 w-4" />} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProblemSection({ c }: { c: LpCopy }) {
  return (
    <Section id="problem">
      <SectionHeader label={c.problem.label} title={c.problem.headline} body={c.problem.body} />
      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {c.problem.points.map((point) => (
          <Card className="rounded-2xl border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]" key={point}>
            <CardContent className="flex gap-3 p-5">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB]">
                <span className="h-2 w-2 rounded-full bg-[#CA8A04]" />
              </span>
              <p className="text-sm font-medium leading-6 text-[#111827]">{point}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function SolutionSection({ c }: { c: LpCopy }) {
  return (
    <Section className="bg-[#F8FAFC]" id="workflow">
      <SectionHeader label={c.solution.label} title={c.solution.headline} body={c.solution.body} />
      <HorizontalFlow items={c.solution.workflow} />
    </Section>
  );
}

function PairAnalysisSection({ c }: { c: LpCopy }) {
  return (
    <Section id="pair-analysis">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <SectionHeader label={c.pair.label} title={c.pair.headline} body={c.pair.body} />
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Pair Health Score</p>
              <p className="mt-1 text-sm text-[#6B7280]">Ad promise compared with LP first viewport</p>
            </div>
            <div className="text-4xl font-bold text-[#2563EB]">82</div>
          </div>
          <div className="space-y-4">
            {c.pair.features.map((item, index) => (
              <div key={item}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{item}</span>
                  <span className="text-[#6B7280]">{[88, 74, 81, 79, 82][index]}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#F8FAFC]">
                  <div className="h-2 rounded-full bg-[#2563EB]" style={{ width: `${[88, 74, 81, 79, 82][index]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function EvidenceSection({ c }: { c: LpCopy }) {
  return (
    <Section className="bg-[#F8FAFC]" id="evidence">
      <SectionHeader label={c.evidence.label} title={c.evidence.headline} body={c.evidence.body} />
      <div className="mt-12 grid gap-5 md:grid-cols-5">
        {c.evidence.cards.map((card, index) => (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" key={card}>
            <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              {[Search, ShieldCheck, Layers3, ClipboardCheck, Sparkles].map((Icon) => <Icon className="h-5 w-5" key={Icon.name} />)[index]}
            </div>
            <h3 className="text-base font-semibold">{card}</h3>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ImprovementSection({ c }: { c: LpCopy }) {
  return (
    <Section id="improvements">
      <SectionHeader label={c.improvement.label} title={c.improvement.headline} body={c.improvement.body} />
      <div className="mt-12 grid gap-5 md:grid-cols-4">
        {c.improvement.workflow.map((item, index) => (
          <ProcessCard index={index + 1} key={item} title={item} />
        ))}
      </div>
    </Section>
  );
}

function ExecutionSection({ c }: { c: LpCopy }) {
  return (
    <Section className="bg-[#F8FAFC]" id="execution">
      <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <SectionHeader label={c.execution.label} title={c.execution.headline} body={c.execution.body} />
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {c.execution.features.map((item, index) => (
            <div className="flex items-center justify-between border-b border-[#E5E7EB] py-4 last:border-0" key={item}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  {index === 1 || index === 2 ? <GitPullRequest className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
                </div>
                <span className="font-medium">{item}</span>
              </div>
              <Check className="h-4 w-4 text-[#16A34A]" />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function OutcomesSection({ c }: { c: LpCopy }) {
  return (
    <Section id="outcomes">
      <SectionHeader label={c.outcomes.label} title={c.outcomes.headline} body={c.outcomes.body} />
      <HorizontalFlow items={c.outcomes.flow} />
    </Section>
  );
}

function RetentionSection({ c }: { c: LpCopy }) {
  return (
    <Section className="bg-[#F8FAFC]" id="why-teams-stay">
      <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <SectionHeader label={c.retention.label} title={c.retention.headline} body={c.retention.body} />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {c.retention.support.map((item) => (
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)]" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="space-y-4">
            {c.retention.flow.map((item, index) => (
              <div className="flex items-center gap-4" key={item}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-sm font-bold text-[#2563EB]">
                  {index + 1}
                </div>
                <div className="flex-1 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold">
                  {item}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function TeamsSection({ c }: { c: LpCopy }) {
  return (
    <Section className="bg-[#F8FAFC]" id="teams">
      <SectionHeader label={c.teams.label} title={c.teams.headline} />
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {c.teams.cards.map(([title, body]) => (
          <Card className="rounded-2xl border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]" key={title}>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mt-4 text-sm leading-7 text-[#6B7280]">{body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function ComparisonSection({ c }: { c: LpCopy }) {
  return (
    <Section id="comparison">
      <SectionHeader label={c.comparison.label} title={c.comparison.headline} />
      <div className="mt-12 grid overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:grid-cols-2">
        <ComparisonColumn items={c.comparison.leftItems} title={c.comparison.leftTitle} />
        <ComparisonColumn highlighted items={c.comparison.rightItems} title={c.comparison.rightTitle} />
      </div>
    </Section>
  );
}

function ProductScreensSection({ c }: { c: LpCopy }) {
  return (
    <Section className="bg-[#F8FAFC]" id="product">
      <SectionHeader label={c.product.label} title={c.product.headline} />
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {c.product.screens.map((screen, index) => (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" key={screen}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-semibold">{screen}</h3>
              <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs text-[#6B7280]">Screen 0{index + 1}</span>
            </div>
            <div className="grid gap-3">
              {[0, 1, 2].map((item) => (
                <div className="h-12 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC]" key={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function PricingSection({ c, locale }: { c: LpCopy; locale: "en" | "ja" }) {
  const currency = locale === "ja" ? "jpy" : "usd";
  return (
    <Section id="pricing">
      <div className="mx-auto max-w-[1100px]">
        <SectionHeader centered label={c.pricing.label} title={c.pricing.headline} body={c.pricing.subheadline} />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {planIds.map((id) => {
            const plan = PLANS[id];
            return (
              <Card className={cn("rounded-2xl border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]", id === "starter" && "border-[#2563EB] ring-1 ring-[#2563EB]")} key={id}>
                <CardContent className="flex h-full flex-col p-6">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className="mt-3 min-h-10 text-sm leading-6 text-[#6B7280]">{c.pricing.planDescriptions[id]}</p>
                  <div className="mt-8 text-4xl font-bold">
                    {formatBillingAmount(plan.prices[currency].amount, currency)}
                    {plan.prices[currency].amount > 0 ? <span className="text-sm font-normal text-[#6B7280]"> {c.pricing.month}</span> : null}
                  </div>
                  <p className="mt-3 text-sm text-[#6B7280]">{plan.monthlyCredits.toLocaleString()} {c.pricing.credits}</p>
                  <Button asChild className={cn("mt-8 h-12 rounded-xl", id === "starter" ? "bg-[#2563EB] text-white hover:bg-[#1D4ED8]" : "border-[#E5E7EB]")} variant={id === "starter" ? "default" : "outline"}>
                    <Link href="/pricing">{c.common.start}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

function FaqSection({ c }: { c: LpCopy }) {
  return (
    <Section className="bg-[#F8FAFC]" id="faq">
      <div className="mx-auto max-w-3xl">
        <Accordion collapsible defaultValue="faq-0" type="single">
          {c.faq.items.map(([question, answer], index) => (
            <AccordionItem className="border-[#E5E7EB]" key={question} value={`faq-${index}`}>
              <AccordionTrigger className="text-left text-lg">{question}</AccordionTrigger>
              <AccordionContent className="text-base leading-7">{answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}

function FinalCtaSection({ c }: { c: LpCopy }) {
  return (
    <section className="bg-white px-6 py-20 md:px-8 md:py-[120px]" id="final-cta">
      <div className="mx-auto max-w-[1280px] rounded-3xl border border-[#E5E7EB] bg-[#111827] px-6 py-16 text-center text-white md:px-20 md:py-20">
        <h2 className="mx-auto max-w-3xl text-4xl font-bold tracking-[-0.04em] md:text-5xl">{c.finalCta.headline}</h2>
        <p className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-lg leading-8 text-white/70">{c.finalCta.body}</p>
        <div className="mx-auto mt-9 grid max-w-md gap-3 sm:flex sm:justify-center">
          <Button asChild className="h-12 rounded-xl bg-[#2563EB] px-6 text-white hover:bg-[#1D4ED8]">
            <Link href="/login">{c.common.start}</Link>
          </Button>
          <Button asChild className="h-12 rounded-xl border-white/20 bg-transparent px-6 text-white hover:bg-white/10" variant="outline">
            <Link href="#product">{c.common.demo}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Section({ children, className, id }: { children: ReactNode; className?: string; id: string }) {
  return (
    <section className={cn("px-6 py-20 md:px-8 md:py-[120px]", className)} id={id}>
      <div className="mx-auto max-w-[1280px]">{children}</div>
    </section>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#2563EB]">{children}</p>;
}

function SectionHeader({ body, centered, label, title }: { body?: readonly string[] | string; centered?: boolean; label: string; title: string }) {
  const bodyItems = Array.isArray(body) ? body : body ? [body] : [];
  return (
    <div className={cn("max-w-3xl", centered && "mx-auto text-center")}>
      <SectionLabel>{label}</SectionLabel>
      <h2 className="mt-4 whitespace-pre-line text-4xl font-bold leading-tight tracking-[-0.04em] text-[#111827] md:text-5xl">{title}</h2>
      {bodyItems.map((item) => (
        <p className="mt-5 text-lg leading-[1.7] text-[#6B7280]" key={item}>{item}</p>
      ))}
    </div>
  );
}

function HorizontalFlow({ items }: { items: readonly string[] }) {
  return (
    <div className="mt-12 grid gap-4 md:grid-cols-7">
      {items.map((item, index) => (
        <ProcessCard index={index + 1} key={item} title={item} />
      ))}
    </div>
  );
}

function ProcessCard({ index, title }: { index: number; title: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <span className="text-xs font-semibold text-[#6B7280]">0{index}</span>
      <p className="mt-4 text-sm font-semibold leading-6">{title}</p>
    </div>
  );
}

function CardBlock({ helper, icon, title, value }: { helper: string; icon: ReactNode; title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <span className="text-[#2563EB]">{icon}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
      <p className="mt-2 text-xs text-[#6B7280]">{helper}</p>
    </div>
  );
}

function ComparisonColumn({ highlighted, items, title }: { highlighted?: boolean; items: readonly string[]; title: string }) {
  return (
    <div className={cn("p-6", highlighted && "border-t border-[#E5E7EB] bg-[#F8FAFC] md:border-l md:border-t-0")}>
      <h3 className="text-xl font-semibold">{title}</h3>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div className="flex items-center gap-3 text-sm" key={item}>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" />
            <span className={highlighted ? "font-medium text-[#111827]" : "text-[#6B7280]"}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
