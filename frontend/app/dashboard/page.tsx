"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, Lightbulb, LineChart, Target } from "lucide-react";

import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdLpPairs } from "@/hooks/use-ad-lp-pairs";
import { useI18n } from "@/hooks/use-i18n";
import { useLandingPages } from "@/hooks/use-landing-pages";
import { useProjects } from "@/hooks/use-projects";
import { useTwitterAds } from "@/hooks/use-twitter-ads";
import { useDemandIntelligenceDashboard, useOutcomesDashboard } from "@/hooks/useAdflowData";
import { useImprovementStats } from "@/hooks/useImprovement";
import { useOutcomeStats } from "@/hooks/use-outcomes";

export default function DashboardPage() {
  const { t } = useI18n();
  const projects = useProjects();
  const ads = useTwitterAds();
  const landingPages = useLandingPages();
  const pairs = useAdLpPairs();
  const demand = useDemandIntelligenceDashboard();
  const outcomes = useOutcomesDashboard();
  const improvementStats = useImprovementStats();
  const outcomeStats = useOutcomeStats();
  const isLoading = projects.isLoading || ads.isLoading || landingPages.isLoading || pairs.isLoading || demand.isLoading || outcomes.isLoading || improvementStats.isLoading || outcomeStats.isLoading;
  const isError = projects.isError || ads.isError || landingPages.isError || pairs.isError || demand.isError || outcomes.isError || improvementStats.isError || outcomeStats.isError;

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState />;

  const counts = {
    projects: projects.data?.length ?? 0,
    ads: ads.data?.length ?? 0,
    lps: landingPages.data?.length ?? 0,
    pairs: pairs.data?.length ?? 0,
    analyzed: pairs.data?.filter((pair) => pair.last_analyzed_at).length ?? 0,
    demand: demand.data?.length ?? 0,
    outcomes: outcomes.data?.length ?? 0,
  };

  return (
    <div className="space-y-6">
      <SectionHeader title={t("dashboard.title")} description={t("dashboard.workspaceDescription")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ModeCard body={t("dashboard.optimizationBody")} cta={t("dashboard.optimizationCta")} href="/ad-optimization" icon={<Target className="h-6 w-6" />} title={t("nav.adOptimization")} />
        <ModeCard body={t("dashboard.discoveryBody")} cta={t("dashboard.discoveryCta")} href="/demand-discovery" icon={<Lightbulb className="h-6 w-6" />} title={t("nav.demandDiscovery")} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle>{t("dashboard.setupProgress")}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-5">
            <Step done={counts.projects > 0} label={t("dashboard.stepProject")} />
            <Step done={counts.ads > 0} label={t("dashboard.stepAd")} />
            <Step done={counts.lps > 0} label={t("dashboard.stepLp")} />
            <Step done={counts.pairs > 0} label={t("dashboard.stepTarget")} />
            <Step done={counts.analyzed > 0} label={t("dashboard.stepAnalysis")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("dashboard.recentResults")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <ResultRow label={t("dashboard.demandRuns")} value={counts.demand} />
            <ResultRow label={t("dashboard.optimizationResults")} value={counts.outcomes} />
            <Button asChild className="w-full" variant="outline"><Link href="/results"><LineChart className="mr-2 h-4 w-4" />{t("dashboard.openResults")}</Link></Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>{t("dashboard.nextAction")}</CardTitle></CardHeader>
        <CardContent><NextAction counts={counts} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Improvement workflow</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <ResultRow label="Total proposals" value={improvementStats.data?.total ?? 0} />
          <ResultRow label="Approval rate %" value={improvementStats.data?.approval_rate ?? 0} />
          <ResultRow label="Rejection rate %" value={improvementStats.data?.rejection_rate ?? 0} />
          <ResultRow label="Apply Ready" value={improvementStats.data?.counts.APPLY_READY ?? 0} />
          <ResultRow label="Applied" value={improvementStats.data?.counts.APPLIED ?? 0} />
          <ResultRow label="Failed" value={improvementStats.data?.counts.FAILED ?? 0} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Outcome learning</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <ResultRow label="Total outcomes" value={outcomeStats.data?.total ?? 0} />
          <ResultRow label="Success rate %" value={outcomeStats.data?.success_rate ?? 0} />
          <ResultRow label="Failure rate %" value={outcomeStats.data?.failure_rate ?? 0} />
          <ResultRow label="Avg improvement %" value={Math.round((outcomeStats.data?.average_improvement_rate ?? 0) * 10000) / 100} />
          <ResultRow label="Avg CTR improvement %" value={Math.round((outcomeStats.data?.average_ctr_improvement ?? 0) * 10000) / 100} />
          <ResultRow label="Learning records" value={outcomeStats.data?.learning.learning_count ?? 0} />
        </CardContent>
      </Card>
    </div>
  );
}

function ModeCard({ body, cta, href, icon, title }: { body: string; cta: string; href: string; icon: ReactNode; title: string }) {
  return <Card className="p-6"><div className="flex items-start gap-4"><div className="rounded-md bg-primary/10 p-3 text-primary">{icon}</div><div className="min-w-0 flex-1"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p><Button asChild className="mt-5"><Link href={href}>{cta}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></div></Card>;
}

function Step({ done, label }: { done: boolean; label: string }) {
  return <div className="rounded-md border border-border p-3 text-sm"><div className="flex items-center gap-2">{done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <span className="h-4 w-4 rounded-full border border-border" />}<span className="font-medium">{label}</span></div></div>;
}

function ResultRow({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-lg font-semibold">{value}</span></div>;
}

function NextAction({ counts }: { counts: { projects: number; ads: number; lps: number; pairs: number; analyzed: number } }) {
  const { t } = useI18n();
  if (!counts.projects) return <Action href="/ad-optimization" label={t("dashboard.actionCreateProject")} text={t("dashboard.actionCreateProjectBody")} />;
  if (!counts.ads) return <Action href="/ads/new" label={t("dashboard.actionAddAd")} text={t("dashboard.actionAddAdBody")} />;
  if (!counts.lps) return <Action href="/lps/new" label={t("dashboard.actionAddLp")} text={t("dashboard.actionAddLpBody")} />;
  if (!counts.pairs) return <Action href="/pairs/new" label={t("dashboard.actionCreateTarget")} text={t("dashboard.actionCreateTargetBody")} />;
  if (!counts.analyzed) return <Action href="/pairs" label={t("dashboard.actionRunAnalysis")} text={t("dashboard.actionRunAnalysisBody")} />;
  return <Action href="/results" label={t("dashboard.actionReviewResults")} text={t("dashboard.actionReviewResultsBody")} />;
}

function Action({ href, label, text }: { href: string; label: string; text: string }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">{text}</p><Button asChild><Link href={href}>{label}</Link></Button></div>;
}
