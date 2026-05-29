"use client";

import type { ReactNode } from "react";
import { Activity, Banknote, BarChart3, Compass, MousePointerClick, Search, Target, Users } from "lucide-react";

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
import { useMarketResearchDashboard, useOutcomesDashboard, useWorkflow } from "@/hooks/useAdflowData";
import type { ImprovementOutcome, MarketResearchSummary } from "@/lib/types/adflow";
import { metricSeries } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const workflow = useWorkflow();
  const campaigns = useCampaigns();
  const improvements = useImprovements();
  const prs = usePrs();
  const marketResearch = useMarketResearchDashboard();
  const outcomes = useOutcomesDashboard();

  if (workflow.isLoading || campaigns.isLoading || improvements.isLoading || prs.isLoading || marketResearch.isLoading || outcomes.isLoading) {
    return <PageSkeleton />;
  }
  if (workflow.isError || campaigns.isError || improvements.isError || prs.isError || marketResearch.isError || outcomes.isError) {
    return <ErrorState />;
  }

  if (!workflow.data || !campaigns.data || !improvements.data || !prs.data) {
    return <ErrorState message="The dashboard data was incomplete." />;
  }

  const latest = workflow.data.ads.performance.at(-1) ?? workflow.data.ads.performance[0];
  const activeCampaigns = campaigns.data.filter((campaign) => campaign.status === "active").length;
  const marketSummaries = (marketResearch.data ?? []).map((run) => run.summary as MarketResearchSummary);
  const painPoints = marketSummaries.flatMap((summary) => summary.main_pain_points ?? []).slice(0, 5);
  const competitors = marketSummaries.flatMap((summary) => summary.main_competitors ?? []).slice(0, 5);
  const opportunities = marketSummaries.flatMap((summary) => summary.opportunities ?? []).slice(0, 5);
  const outcomeItems = outcomes.data ?? [];

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Dashboard"
        description="Monitor campaign performance, AI findings, diff risks, and PR review readiness."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Users className="h-5 w-5" />} label="Total impressions" value={latest.impressions} />
        <KpiCard icon={<MousePointerClick className="h-5 w-5" />} label="Clicks" value={latest.clicks} />
        <KpiCard icon={<Target className="h-5 w-5" />} label="CTR" value={`${latest.ctr}%`} delta={`${workflow.data.features.ctr_trend}% vs start`} tone="bad" />
        <KpiCard icon={<Banknote className="h-5 w-5" />} label="Spend" value={formatCurrency(latest.spend)} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard icon={<Activity className="h-5 w-5" />} label="CPC" value={formatCurrency(latest.cpc)} tone="bad" />
        <KpiCard icon={<Target className="h-5 w-5" />} label="CVR" value={`${latest.cvr}%`} />
        <KpiCard icon={<Users className="h-5 w-5" />} label="Active campaigns" value={activeCampaigns} />
      </div>

      <RiskAlerts />

      <div className="grid gap-4 xl:grid-cols-3">
        <MarketSignalCard icon={<Search className="h-5 w-5" />} title="Top Pain Points" items={painPoints} empty="No pain signals yet." />
        <MarketSignalCard icon={<Users className="h-5 w-5" />} title="Top Competitors" items={competitors} empty="No competitor signals yet." />
        <MarketSignalCard icon={<Compass className="h-5 w-5" />} title="Opportunity Signals" items={opportunities} empty="No opportunity signals yet." />
      </div>

      <RecentOutcomesCard outcomes={outcomeItems} />

      <div className="grid gap-6 xl:grid-cols-2">
        <MetricsChart data={metricSeries} />
        <MetricsChart data={metricSeries} mode="spend" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RecentImprovements items={improvements.data} />
        <PendingPrList items={prs.data} />
      </div>
    </div>
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
