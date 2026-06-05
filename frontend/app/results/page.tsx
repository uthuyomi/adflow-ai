"use client";

import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdLpPairs } from "@/hooks/use-ad-lp-pairs";
import { useChangeHistory } from "@/hooks/use-change-history";
import { useI18n } from "@/hooks/use-i18n";
import { useDemandIntelligenceDashboard, useOutcomesDashboard } from "@/hooks/useAdflowData";
import { usePrs } from "@/hooks/usePrs";

export default function ResultsPage() {
  const { t } = useI18n();
  const pairs = useAdLpPairs();
  const demand = useDemandIntelligenceDashboard();
  const outcomes = useOutcomesDashboard();
  const history = useChangeHistory();
  const prs = usePrs();

  const isLoading = pairs.isLoading || demand.isLoading || outcomes.isLoading || history.isLoading || prs.isLoading;
  const isError = pairs.isError || demand.isError || outcomes.isError || history.isError || prs.isError;

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState />;

  const analyzedPairs = (pairs.data ?? []).filter((pair) => pair.last_analyzed_at);
  const demandRuns = demand.data ?? [];
  const outcomeList = outcomes.data ?? [];
  const historyList = history.data ?? [];
  const prList = prs.data ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader title={t("results.title")} description={t("results.description")} />

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label={t("results.analyzedTargets")} value={analyzedPairs.length} />
        <Metric label={t("results.discoveryRuns")} value={demandRuns.length} />
        <Metric label={t("results.recordedResults")} value={outcomeList.length} />
        <Metric label={t("results.implementationItems")} value={prList.length} />
      </div>

      <Tabs defaultValue="ad-results">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="ad-results">{t("results.adResults")}</TabsTrigger>
          <TabsTrigger value="demand-results">{t("results.demandResults")}</TabsTrigger>
          <TabsTrigger value="implementation">{t("results.implementationResults")}</TabsTrigger>
          <TabsTrigger value="activity">{t("results.activityHistory")}</TabsTrigger>
        </TabsList>

        <TabsContent value="ad-results">
          {outcomeList.length ? (
            <div className="space-y-3">
              {outcomeList.map((outcome) => (
                <Card className="p-4" key={outcome.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{outcome.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{outcome.outcome_summary || outcome.description || t("results.noSummary")}</div>
                    </div>
                    <Badge>{outcome.outcome_status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <EmptyState title={t("results.noAdResults")} description={t("results.noAdResultsDescription")} />
              <div className="flex justify-center">
                <Button asChild>
                  <Link href="/ad-optimization">{t("results.openAdOptimization")}</Link>
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="demand-results">
          {demandRuns.length ? (
            <div className="space-y-3">
              {demandRuns.map((run) => (
                <Card className="p-4" key={run.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{run.query}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{summaryOverview(run.summary, t("results.noOverview"))}</div>
                    </div>
                    <Badge variant="secondary">{run.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <EmptyState title={t("results.noDemandResults")} description={t("results.noDemandResultsDescription")} />
              <div className="flex justify-center">
                <Button asChild>
                  <Link href="/demand-discovery">{t("results.openDemandDiscovery")}</Link>
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="implementation">
          {prList.length ? (
            <div className="space-y-3">
              {prList.map((pr) => (
                <Card className="p-4" key={pr.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{pr.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{pr.url || t("results.noPrUrl")}</div>
                    </div>
                    <Badge>{pr.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title={t("results.noImplementationResults")} description={t("results.noImplementationResultsDescription")} />
          )}
        </TabsContent>

        <TabsContent value="activity">
          {historyList.length ? (
            <div className="space-y-3">
              {historyList.slice(0, 30).map((item) => (
                <Card className="p-4" key={item.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{item.summary || `${item.entity_type} ${item.action}`}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{item.reason || t("results.noReason")}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title={t("results.noActivity")} description={t("results.noActivityDescription")} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </Card>
  );
}

function summaryOverview(summary: unknown, fallback: string) {
  if (summary && typeof summary === "object" && "overview" in summary) {
    const overview = (summary as { overview?: unknown }).overview;
    if (typeof overview === "string" && overview) return overview;
  }
  return fallback;
}
