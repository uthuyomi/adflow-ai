"use client";

import { useParams } from "next/navigation";
import { Play } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdLpPair } from "@/hooks/use-ad-lp-pairs";
import { useAnalysisRuns, useRunPairAnalysis } from "@/hooks/use-analysis-runs";
import { usePairChangeHistory } from "@/hooks/use-change-history";
import { useLandingPageVersions } from "@/hooks/use-landing-pages";
import { useAIAgentDecision, useAIAgentResults, useGenerateCodexTask } from "@/hooks/use-orchestration";
import type { AIAgentResult, AIHistoryBasedRecommendation, LandingPageVersion } from "@/lib/types/adflow";

export default function PairDetailPage() {
  const params = useParams<{ pairId: string }>();
  const pair = useAdLpPair(params.pairId);
  const runs = useAnalysisRuns(params.pairId);
  const history = usePairChangeHistory(pair.data);
  const versions = useLandingPageVersions(pair.data?.landing_page_id ?? "");
  const run = useRunPairAnalysis(params.pairId);
  const decision = useAIAgentDecision();
  const codexTask = useGenerateCodexTask();

  const analyze = async () => {
    try {
      await run.mutateAsync();
      toast.success("Analysis completed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed.");
    }
  };

  const latest = runs.data?.[0];
  const insights = latest?.history_insights as AIHistoryBasedRecommendation | undefined;
  const agentResults = useAIAgentResults(insights?.orchestration_run_id);

  if (pair.isLoading || runs.isLoading || history.isLoading || versions.isLoading || agentResults.isLoading) return <PageSkeleton />;
  if (pair.isError || !pair.data) return <ErrorState />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={pair.data.name}
        description="Inspect the registered ad, LP, history, and pair-level AI recommendations."
        action={
          <Button onClick={analyze} disabled={run.isPending}>
            <Play className="mr-2 h-4 w-4" />
            {run.isPending ? "Running..." : "Run analysis"}
          </Button>
        }
      />
      {latest ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Score" value={latest.score ?? 0} suffix="" />
          <Metric label="Hero similarity" value={latest.hero_similarity ?? 0} />
          <Metric label="CTA strength" value={latest.cta_strength ?? 0} />
          <Metric label="Bounce rate" value={latest.bounce_rate ?? 0} />
        </div>
      ) : null}

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="runs">Analysis</TabsTrigger>
          <TabsTrigger value="comparison">AI Comparison</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="orchestration">AI OS</TabsTrigger>
          <TabsTrigger value="ai">AI Recommendations</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>X ad</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-medium">{pair.data.twitter_ads?.name}</div>
                <div>{pair.data.twitter_ads?.headline || "-"}</div>
                <div className="text-muted-foreground">{pair.data.twitter_ads?.body || "-"}</div>
                <Badge>{pair.data.twitter_ads?.cta || "No CTA"}</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Landing page</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-medium">{pair.data.landing_pages?.name}</div>
                <div>{pair.data.landing_pages?.hero_title || "-"}</div>
                <div className="text-muted-foreground">{pair.data.landing_pages?.hero_subtitle || "-"}</div>
                <Badge>{pair.data.landing_pages?.primary_cta || "No CTA"}</Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="runs">
          {runs.data?.length ? (
            <div className="space-y-3">
              {runs.data.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{new Date(item.created_at).toLocaleString()}</div>
                    <Badge variant={item.risk_level === "high" ? "warning" : "secondary"}>{item.risk_level ?? "unknown"}</Badge>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                    <div>Score: {item.score ?? "-"}</div>
                    <div>Hero: {item.hero_similarity ?? "-"}%</div>
                    <div>CTA: {item.cta_strength ?? "-"}%</div>
                    <div>Bounce: {item.bounce_rate ?? "-"}%</div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No analysis runs" description="Run analysis to save pair-level results." />
          )}
        </TabsContent>
        <TabsContent value="comparison">
          <AIProposalComparison
            results={agentResults.data ?? []}
            messageMatchScore={Number((latest as Record<string, unknown> | undefined)?.message_match_score ?? latest?.hero_similarity ?? 0)}
            isDeciding={decision.isPending}
            isGeneratingTask={codexTask.isPending}
            onDecision={async (resultId, decisionStatus) => {
              try {
                await decision.mutateAsync({
                  resultId,
                  decision_status: decisionStatus,
                  decision_reason: `Marked ${decisionStatus} from pair detail.`,
                });
                toast.success(`Marked ${decisionStatus}.`);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Decision failed.");
              }
            }}
            onCodexTask={async (resultId) => {
              try {
                await codexTask.mutateAsync(resultId);
                toast.success("Codex task prompt generated.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Codex task generation failed.");
              }
            }}
          />
        </TabsContent>
        <TabsContent value="versions">
          <VersionTimeline versions={versions.data ?? []} />
        </TabsContent>
        <TabsContent value="history">
          {history.data?.length ? (
            <div className="space-y-3">
              {history.data.map((item) => (
                <Card key={item.id} className="p-4 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div className="font-medium">{item.summary || `${item.entity_type} ${item.action}`}</div>
                    <div className="text-muted-foreground">{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                  {item.reason ? <p className="mt-2 text-muted-foreground">{item.reason}</p> : null}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No history" description="Create, update, and delete events for this pair will appear here." />
          )}
        </TabsContent>
        <TabsContent value="orchestration">
          {insights?.agent_results?.length ? (
            <div className="space-y-3">
              {insights.agent_results.map((result) => (
                <Card key={`${result.agent_key}-${result.task}`} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{result.task}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {result.provider} / {result.role}
                      </div>
                    </div>
                    <Badge variant={result.output.risk_level === "high" ? "warning" : "secondary"}>
                      {result.output.risk_level ?? "unknown"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{result.output.summary}</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {result.output.recommendations.map((item) => (
                      <div key={item} className="rounded-md border border-border p-3 text-sm">
                        {item}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No orchestration log" description="Run analysis to route this pair through specialized AI desks." />
          )}
        </TabsContent>
        <TabsContent value="ai">
          {insights ? (
            <Card>
              <CardHeader>
                <CardTitle>{insights.overall_diagnosis}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-sm">
                <p className="text-muted-foreground">{insights.likely_problem}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {insights.ad_recommendations.map((item) => (
                    <div className="rounded-md border border-border p-4" key={`ad-${item.field}-${item.suggested_value}`}>
                      <div className="font-medium">Ad: {item.field}</div>
                      <div className="mt-2">{item.suggested_value}</div>
                      <p className="mt-2 text-muted-foreground">{item.reason}</p>
                    </div>
                  ))}
                  {insights.lp_recommendations.map((item) => (
                    <div className="rounded-md border border-border p-4" key={`lp-${item.field}-${item.suggested_value}`}>
                      <div className="font-medium">LP: {item.field}</div>
                      <div className="mt-2">{item.suggested_value}</div>
                      <p className="mt-2 text-muted-foreground">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState title="No AI recommendation" description="Run analysis to generate history-aware improvement support." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AIProposalComparison({
  results,
  messageMatchScore,
  isDeciding,
  isGeneratingTask,
  onDecision,
  onCodexTask,
}: {
  results: AIAgentResult[];
  messageMatchScore: number;
  isDeciding: boolean;
  isGeneratingTask: boolean;
  onDecision: (resultId: string, status: AIAgentResult["decision_status"]) => Promise<void>;
  onCodexTask: (resultId: string) => Promise<void>;
}) {
  if (!results.length) {
    return <EmptyState title="No AI proposals" description="Run analysis to compare Grok, Gemini, ChatGPT, and reviewer outputs." />;
  }
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {results.map((result) => {
        const output = result.output as {
          summary?: string;
          recommendations?: string[];
          predicted_effect?: Record<string, unknown>;
          next_action?: string | null;
        };
        return (
          <Card key={result.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{result.agent_key}</div>
                <div className="mt-1 text-sm text-muted-foreground">{result.provider} / {result.role}</div>
              </div>
              <Badge variant={result.decision_status === "apply_ready" ? "warning" : "secondary"}>{result.decision_status}</Badge>
            </div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground">Metric</div>
                <div className="font-medium">{result.task}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Risk</div>
                <div className="font-medium">{result.risk_level ?? "unknown"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Confidence</div>
                <div className="font-medium">{Math.round((result.confidence ?? 0) * 100)}%</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{output.summary ?? "No summary"}</p>
            <div className="mt-3 space-y-2">
              {(output.recommendations ?? []).slice(0, 3).map((item) => (
                <div key={item} className="rounded-md border border-border p-3 text-sm">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
              <div>Message match: {messageMatchScore}%</div>
              <div>Score: {result.score ?? "-"}</div>
              <div>Generated: {new Date(result.created_at).toLocaleString()}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["accepted", "rejected", "needs_review", "apply_ready"] as const).map((status) => (
                <Button key={status} size="sm" variant="outline" disabled={isDeciding} onClick={() => onDecision(result.id, status)}>
                  {status}
                </Button>
              ))}
              <Button size="sm" disabled={isGeneratingTask || result.decision_status !== "apply_ready"} onClick={() => onCodexTask(result.id)}>
                Generate Codex Task
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function VersionTimeline({ versions }: { versions: LandingPageVersion[] }) {
  if (!versions.length) {
    return <EmptyState title="No LP versions" description="LP create and update operations will store version snapshots." />;
  }
  return (
    <div className="space-y-3">
      {versions.map((version) => {
        const snapshot = version.snapshot as Record<string, unknown>;
        return (
          <Card key={version.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">Version {version.version_number}</div>
              <div className="text-sm text-muted-foreground">{new Date(version.created_at).toLocaleString()}</div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{version.change_summary ?? "No summary"}</p>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div>Hero: {String(snapshot.hero_title ?? "-")}</div>
              <div>CTA: {String(snapshot.primary_cta ?? "-")}</div>
              <div>Offer: {String(snapshot.offer_text ?? "-")}</div>
              <div>Page speed: {String(snapshot.page_speed ?? "-")}</div>
              <div>Scroll depth: {String(snapshot.scroll_depth ?? "-")}</div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Metric({ label, value, suffix = "%" }: { label: string; value: number; suffix?: string }) {
  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}{suffix}</div>
      <Progress className="mt-3" value={Math.max(0, Math.min(100, value))} />
    </Card>
  );
}
