"use client";

import type { ReactNode } from "react";
import { Activity, Banknote, BarChart3, CheckCircle2, Circle, Compass, MousePointerClick, Search, Target, Users } from "lucide-react";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { MetricsChart } from "@/components/dashboard/MetricsChart";
import { PendingPrList } from "@/components/dashboard/PendingPrList";
import { RecentImprovements } from "@/components/dashboard/RecentImprovements";
import { RiskAlerts } from "@/components/dashboard/RiskAlerts";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Card } from "@/components/ui/card";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useImprovements } from "@/hooks/useImprovement";
import { usePrs } from "@/hooks/usePrs";
import { useDemandIntelligenceDashboard, useOutcomesDashboard } from "@/hooks/useAdflowData";
import { useTwitterAds } from "@/hooks/use-twitter-ads";
import { useAdLpPairs } from "@/hooks/use-ad-lp-pairs";
import { useI18n } from "@/hooks/use-i18n";
import { useLandingPages } from "@/hooks/use-landing-pages";
import { useProjects } from "@/hooks/use-projects";
import type { DemandIntelligenceSummary, DemandMonitoringSummary, DemandSolutionFitSummary, DemandSourceStatusSummary, DemandValidationSummary, ImprovementOutcome } from "@/lib/types/adflow";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const { t } = useI18n();
  const projects = useProjects();
  const ads = useTwitterAds();
  const landingPages = useLandingPages();
  const pairs = useAdLpPairs();
  const campaigns = useCampaigns();
  const improvements = useImprovements();
  const prs = usePrs();
  const demandIntelligence = useDemandIntelligenceDashboard();
  const outcomes = useOutcomesDashboard();

  if (projects.isLoading || ads.isLoading || landingPages.isLoading || pairs.isLoading || campaigns.isLoading || improvements.isLoading || prs.isLoading || demandIntelligence.isLoading || outcomes.isLoading) {
    return <PageSkeleton />;
  }
  if (projects.isError || ads.isError || landingPages.isError || pairs.isError || campaigns.isError || improvements.isError || prs.isError || demandIntelligence.isError || outcomes.isError) {
    return <ErrorState />;
  }

  if (!campaigns.data || !improvements.data || !prs.data) {
    return <ErrorState message="The dashboard data was incomplete." />;
  }

  const adItems = ads.data ?? [];
  const totals = {
    impressions: adItems.reduce((sum, ad) => sum + Number(ad.impressions ?? 0), 0),
    clicks: adItems.reduce((sum, ad) => sum + Number(ad.clicks ?? 0), 0),
    conversions: adItems.reduce((sum, ad) => sum + Number(ad.conversions ?? 0), 0),
    spend: adItems.reduce((sum, ad) => sum + Number(ad.spend ?? 0), 0),
  };
  const ctr = totals.impressions ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0;
  const cpc = totals.clicks ? Number((totals.spend / totals.clicks).toFixed(2)) : 0;
  const cvr = totals.clicks ? Number(((totals.conversions / totals.clicks) * 100).toFixed(2)) : 0;
  const chartSeries = campaigns.data.map((campaign) => ({
    label: campaign.campaign_name,
    ctr: campaign.ctr,
    cvr: campaign.cvr,
    cpc: campaign.cpc,
    spend: campaign.spend,
  }));
  const activeCampaigns = campaigns.data.filter((campaign) => campaign.status === "active").length;
  const demandSummaries = (demandIntelligence.data ?? []).map((run) => run.summary as DemandIntelligenceSummary);
  const painClusters = demandSummaries.flatMap((summary) => summary.top_pain_clusters ?? []).map((item) => `${item.name} (${item.demand_signal_score})`).slice(0, 5);
  const desireClusters = demandSummaries.flatMap((summary) => summary.top_desire_clusters ?? []).map((item) => `${item.name} (${item.demand_signal_score})`).slice(0, 5);
  const demandSignals = demandSummaries.flatMap((summary) => summary.top_demand_signals ?? []).map((item) => `${item.name}: ${item.trend}`).slice(0, 5);
  const trends = demandSummaries.flatMap((summary) => summary.emerging_trends ?? []).map((item) => `${String(item.cluster ?? "-")}: ${String(item.trend ?? "-")}`).slice(0, 5);
  const competitorGaps = demandSummaries.flatMap((summary) => summary.competitor_gaps ?? []).map((item) => `${String(item.name ?? "-")} (${String(item.gap_score ?? "-")})`).slice(0, 5);
  const opportunities = demandSummaries.flatMap((summary) => summary.opportunities ?? []).map((item) => item.name).slice(0, 5);
  const features = demandSummaries.flatMap((summary) => summary.recommended_features ?? []).map((item) => `${item.feature_name} / ${item.priority}`).slice(0, 5);
  const positioning = demandSummaries.flatMap((summary) => summary.recommended_positioning?.key_messages ?? []).slice(0, 5);
  const validationSummaries = demandSummaries.map((summary) => summary.validation_summary as DemandValidationSummary);
  const solutionFitSummaries = demandSummaries.map((summary) => summary.solution_fit_summary as DemandSolutionFitSummary);
  const monitoringSummaries = demandSummaries.map((summary) => summary.monitoring_summary as DemandMonitoringSummary);
  const sourceSummaries = demandSummaries.map((summary) => summary.source_status_summary as DemandSourceStatusSummary);
  const strongSignals = validationSummaries
    .flatMap((summary) => summary.strong_validated_clusters ?? [])
    .map((item) => `${String(item.name ?? "Signal")} (${String(item.validation_score ?? "-")})`)
    .slice(0, 5);
  const weakSignals = validationSummaries
    .flatMap((summary) => summary.weak_or_noisy_clusters ?? [])
    .map((item) => `${String(item.name ?? "Signal")} (${String(item.validation_score ?? "-")})`)
    .slice(0, 5);
  const fitGaps = solutionFitSummaries
    .flatMap((summary) => summary.top_solution_fit_gaps ?? [])
    .map((item) => `${String(item.cluster_name ?? item.name ?? "Gap")} (${String(item.gap_score ?? "-")})`)
    .slice(0, 5);
  const emergingDemand = monitoringSummaries
    .flatMap((summary) => summary.emerging_clusters ?? [])
    .map((item) => `${String(item.cluster_name ?? item.name ?? "Emerging")} (${String(item.demand_signal_score ?? "-")})`)
    .slice(0, 5);
  const growingDemand = monitoringSummaries
    .flatMap((summary) => summary.growing_clusters ?? [])
    .map((item) => `${String(item.cluster_name ?? item.name ?? "Growing")} (${String(item.demand_signal_score ?? "-")})`)
    .slice(0, 5);
  const sourceStatus = sourceSummaries
    .flatMap((summary) => summary.sources ?? [])
    .map((item) => `${String(item.connector_key ?? item.source_type ?? "source")}: ${String(item.status ?? "-")}`)
    .slice(0, 5);
  const searchOpportunities = demandSummaries
    .flatMap((summary) => ((summary.search_demand_summary as Record<string, unknown> | undefined)?.high_search_opportunity as string[] | undefined) ?? [])
    .slice(0, 5);
  const promisingSegments = demandSummaries
    .flatMap((summary) => ((summary.market_size_summary as Record<string, unknown> | undefined)?.promising_segments as Record<string, unknown>[] | undefined) ?? [])
    .map((item) => `${String(item.segment_name ?? "Segment")} (${String(item.market_size_score ?? "-")})`)
    .slice(0, 5);
  const outcomeValidated = demandSummaries
    .flatMap((summary) => ((summary.outcome_learning_summary as Record<string, unknown> | undefined)?.validated_demand_patterns as string[] | undefined) ?? [])
    .slice(0, 5);
  const outcomeFailed = demandSummaries
    .flatMap((summary) => ((summary.outcome_learning_summary as Record<string, unknown> | undefined)?.failed_demand_patterns as string[] | undefined) ?? [])
    .slice(0, 5);
  const nextTests = demandSummaries
    .flatMap((summary) => ((summary.outcome_learning_summary as Record<string, unknown> | undefined)?.recommended_next_tests as string[] | undefined) ?? [])
    .slice(0, 5);
  const outcomeItems = outcomes.data ?? [];

  return (
    <div className="space-y-8">
      <SectionHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      <GettingStartedWidget
        steps={[
          { label: t("dashboard.gettingStarted.project"), complete: Boolean(projects.data?.length) },
          { label: t("dashboard.gettingStarted.ad"), complete: Boolean(adItems.length) },
          { label: t("dashboard.gettingStarted.lp"), complete: Boolean(landingPages.data?.length) },
          { label: t("dashboard.gettingStarted.pair"), complete: Boolean(pairs.data?.length) },
          { label: t("dashboard.gettingStarted.analysis"), complete: Boolean(improvements.data.length || demandIntelligence.data?.length) },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Users className="h-5 w-5" />} label={t("dashboard.totalImpressions")} value={totals.impressions} />
        <KpiCard icon={<MousePointerClick className="h-5 w-5" />} label={t("dashboard.clicks")} value={totals.clicks} />
        <KpiCard icon={<Target className="h-5 w-5" />} label={t("dashboard.ctr")} value={`${ctr}%`} />
        <KpiCard icon={<Banknote className="h-5 w-5" />} label={t("dashboard.spend")} value={formatCurrency(totals.spend)} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard icon={<Activity className="h-5 w-5" />} label={t("dashboard.cpc")} value={formatCurrency(cpc)} />
        <KpiCard icon={<Target className="h-5 w-5" />} label={t("dashboard.cvr")} value={`${cvr}%`} />
        <KpiCard icon={<Users className="h-5 w-5" />} label={t("dashboard.activeCampaigns")} value={activeCampaigns} />
      </div>

      <RiskAlerts />

      <div className="grid gap-4 xl:grid-cols-3">
        <MarketSignalCard icon={<Search className="h-5 w-5" />} title="Top Pain Clusters" items={painClusters} empty="No pain clusters yet." />
        <MarketSignalCard icon={<Users className="h-5 w-5" />} title="Top Desire Clusters" items={desireClusters} empty="No desire clusters yet." />
        <MarketSignalCard icon={<Compass className="h-5 w-5" />} title="Top Demand Signals" items={demandSignals} empty="No demand signals yet." />
        <MarketSignalCard icon={<BarChart3 className="h-5 w-5" />} title="Emerging Trends" items={trends} empty="No trend signals yet." />
        <MarketSignalCard icon={<Users className="h-5 w-5" />} title="Competitor Gaps" items={competitorGaps} empty="No competitor gaps yet." />
        <MarketSignalCard icon={<Compass className="h-5 w-5" />} title="Opportunity Signals" items={opportunities} empty="No opportunity signals yet." />
        <MarketSignalCard icon={<Search className="h-5 w-5" />} title="Recommended Features" items={features} empty="No feature suggestions yet." />
        <MarketSignalCard icon={<Target className="h-5 w-5" />} title="Recommended Positioning" items={positioning} empty="No positioning yet." />
        <MarketSignalCard icon={<BarChart3 className="h-5 w-5" />} title="Strong Validated Signals" items={strongSignals} empty="No validated signals yet." />
        <MarketSignalCard icon={<Search className="h-5 w-5" />} title="Weak / Noisy Signals" items={weakSignals} empty="No weak or noisy signals yet." />
        <MarketSignalCard icon={<Compass className="h-5 w-5" />} title="Solution Fit Gaps" items={fitGaps} empty="No solution fit gaps yet." />
        <MarketSignalCard icon={<BarChart3 className="h-5 w-5" />} title="Emerging Demand Signals" items={emergingDemand} empty="No emerging demand signals yet." />
        <MarketSignalCard icon={<BarChart3 className="h-5 w-5" />} title="Growing Demand Signals" items={growingDemand} empty="No growing demand signals yet." />
        <MarketSignalCard icon={<Activity className="h-5 w-5" />} title="Source Collection Status" items={sourceStatus} empty="No source status yet." />
        <MarketSignalCard icon={<Search className="h-5 w-5" />} title="Search Demand Opportunities" items={searchOpportunities} empty="No search demand opportunities yet." />
        <MarketSignalCard icon={<Target className="h-5 w-5" />} title="Promising Market Segments" items={promisingSegments} empty="No market segment estimates yet." />
        <MarketSignalCard icon={<BarChart3 className="h-5 w-5" />} title="Outcome-Validated Signals" items={outcomeValidated} empty="No outcome-validated signals yet." />
        <MarketSignalCard icon={<BarChart3 className="h-5 w-5" />} title="Failed Demand Signals" items={outcomeFailed} empty="No failed demand signals yet." />
        <MarketSignalCard icon={<Compass className="h-5 w-5" />} title="Next Test Recommendations" items={nextTests} empty="No next test recommendations yet." />
      </div>

      <RecentOutcomesCard outcomes={outcomeItems} />

      <div className="grid gap-6 xl:grid-cols-2">
        <MetricsChart data={chartSeries} />
        <MetricsChart data={chartSeries} mode="spend" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RecentImprovements items={improvements.data} />
        <PendingPrList items={prs.data} />
      </div>
    </div>
  );
}

function GettingStartedWidget({ steps }: { steps: { label: string; complete: boolean }[] }) {
  const { t } = useI18n();
  const completed = steps.filter((step) => step.complete).length;
  const nextStep = steps.find((step) => !step.complete);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">{t("dashboard.gettingStarted.title")}</div>
          <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.gettingStarted.copy")}</p>
        </div>
        <div className="rounded-md border border-border px-3 py-2 text-sm font-medium">
          {completed}/{steps.length} {t("dashboard.gettingStarted.complete")}
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {steps.map((step) => (
          <div className="rounded-md border border-border p-3 text-sm" key={step.label}>
            <div className="flex items-center gap-2">
              {step.complete ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
              <span className="font-medium">{step.label}</span>
            </div>
          </div>
        ))}
      </div>
      {nextStep ? (
        <div className="mt-4 text-sm text-muted-foreground">
          {t("dashboard.gettingStarted.next")}: {nextStep.label}
        </div>
      ) : null}
    </Card>
  );
}

function RecentOutcomesCard({ outcomes }: { outcomes: ImprovementOutcome[] }) {
  const positive = outcomes.filter((item) => item.outcome_status === "positive").length;
  const negative = outcomes.filter((item) => item.outcome_status === "negative").length;
  const inconclusive = outcomes.filter((item) => item.outcome_status === "inconclusive").length;
  const avgCtr = averageDelta(outcomes, "ctr_delta");
  const avgCvr = averageDelta(outcomes, "cvr_delta");
  const notes = outcomes.map((item) => item.learning_notes).filter(Boolean).slice(0, 4);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">Recent Outcomes</div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <OutcomeStat label="Positive" value={positive} />
        <OutcomeStat label="Negative" value={negative} />
        <OutcomeStat label="Inconclusive" value={inconclusive} />
        <OutcomeStat label="Avg CTR delta" value={avgCtr ?? "-"} />
        <OutcomeStat label="Avg CVR delta" value={avgCvr ?? "-"} />
      </div>
      <div className="mt-4 grid gap-2">
        {notes.length ? notes.map((note) => (
          <div className="rounded-md border border-border p-3 text-sm" key={note}>{note}</div>
        )) : <div className="text-sm text-muted-foreground">No learning notes yet.</div>}
      </div>
    </Card>
  );
}

function OutcomeStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function averageDelta(outcomes: ImprovementOutcome[], key: string) {
  const values = outcomes
    .map((item) => item.metric_delta?.[key])
    .filter((value): value is number => typeof value === "number");
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4));
}

function MarketSignalCard({
  icon,
  title,
  items,
  empty,
}: {
  icon: ReactNode;
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">{title}</div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
          {icon}
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {items.length ? items.map((item) => (
          <div className="rounded-md border border-border p-3 text-sm" key={item}>{item}</div>
        )) : <div className="text-sm text-muted-foreground">{empty}</div>}
      </div>
    </Card>
  );
}
