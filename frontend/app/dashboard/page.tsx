"use client";

import { Activity, Banknote, MousePointerClick, Target, Users } from "lucide-react";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { MetricsChart } from "@/components/dashboard/MetricsChart";
import { PendingPrList } from "@/components/dashboard/PendingPrList";
import { RecentImprovements } from "@/components/dashboard/RecentImprovements";
import { RiskAlerts } from "@/components/dashboard/RiskAlerts";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useImprovements } from "@/hooks/useImprovement";
import { usePrs } from "@/hooks/usePrs";
import { useWorkflow } from "@/hooks/useAdflowData";
import { metricSeries } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const workflow = useWorkflow();
  const campaigns = useCampaigns();
  const improvements = useImprovements();
  const prs = usePrs();

  if (workflow.isLoading || campaigns.isLoading || improvements.isLoading || prs.isLoading) {
    return <PageSkeleton />;
  }
  if (workflow.isError || campaigns.isError || improvements.isError || prs.isError) {
    return <ErrorState />;
  }

  if (!workflow.data || !campaigns.data || !improvements.data || !prs.data) {
    return <ErrorState message="The dashboard data was incomplete." />;
  }

  const latest = workflow.data.ads.performance.at(-1) ?? workflow.data.ads.performance[0];
  const activeCampaigns = campaigns.data.filter((campaign) => campaign.status === "active").length;

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
