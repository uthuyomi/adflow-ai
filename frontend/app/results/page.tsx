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
import { useDemandIntelligenceDashboard, useOutcomesDashboard } from "@/hooks/useAdflowData";
import { useChangeHistory } from "@/hooks/use-change-history";
import { usePrs } from "@/hooks/usePrs";

export default function ResultsPage() {
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
      <SectionHeader
        title="Results"
        description="Ad Optimization と Demand Discovery の結果、実装状態、活動履歴を横断して確認します。"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Analyzed targets" value={analyzedPairs.length} />
        <Metric label="Discovery runs" value={demandRuns.length} />
        <Metric label="Recorded results" value={outcomeList.length} />
        <Metric label="Implementation items" value={prList.length} />
      </div>

      <Tabs defaultValue="ad-results">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="ad-results">Ad Optimization Results</TabsTrigger>
          <TabsTrigger value="demand-results">Demand Discovery Results</TabsTrigger>
          <TabsTrigger value="implementation">Implementation Results</TabsTrigger>
          <TabsTrigger value="activity">Activity History</TabsTrigger>
        </TabsList>

        <TabsContent value="ad-results">
          {outcomeList.length ? (
            <div className="space-y-3">
              {outcomeList.map((outcome) => (
                <Card className="p-4" key={outcome.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{outcome.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{outcome.outcome_summary || outcome.description || "No summary"}</div>
                    </div>
                    <Badge>{outcome.outcome_status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <EmptyState
                title="No ad optimization results"
                description="改善提案を実装したら、before / after metrics を記録してください。"
              />
              <div className="flex justify-center">
                <Button asChild>
                  <Link href="/ad-optimization">Open Ad Optimization</Link>
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
                      <div className="mt-1 text-sm text-muted-foreground">{summaryOverview(run.summary)}</div>
                    </div>
                    <Badge variant="secondary">{run.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <EmptyState
                title="No demand discovery results"
                description="チャットでアイデアや訴求を相談すると、結果がここに表示されます。"
              />
              <div className="flex justify-center">
                <Button asChild>
                  <Link href="/demand-discovery">Open Demand Discovery</Link>
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
                      <div className="mt-1 text-sm text-muted-foreground">{pr.url || "No PR URL"}</div>
                    </div>
                    <Badge>{pr.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No implementation results" description="Ready to Apply の提案から実装タスクやPRが作られるとここに表示されます。" />
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
                      <div className="mt-1 text-sm text-muted-foreground">{item.reason || "No reason"}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No activity" description="作成、更新、分析、判断、結果記録がここに表示されます。" />
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

function summaryOverview(summary: unknown) {
  if (summary && typeof summary === "object" && "overview" in summary) {
    const overview = (summary as { overview?: unknown }).overview;
    if (typeof overview === "string" && overview) return overview;
  }
  return "No overview";
}
