"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { BarChart3, Play, Search, Settings, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdLpPair } from "@/hooks/use-ad-lp-pairs";
import { useAnalysisRuns, useRunPairAnalysis } from "@/hooks/use-analysis-runs";
import { usePairChangeHistory } from "@/hooks/use-change-history";
import { useCreateImprovementOutcome, useCreateOutcomeFromAIResult, useImprovementOutcomes, useUpdateImprovementOutcome } from "@/hooks/use-improvement-outcomes";
import { useLandingPageVersions } from "@/hooks/use-landing-pages";
import { useLatestMarketResearch, useRunMarketResearch } from "@/hooks/use-market-research";
import { useAIAgentDecision, useAIAgentResults, useGenerateCodexTask } from "@/hooks/use-orchestration";
import { useUiStore } from "@/lib/store";
import type { AIAgentResult, AIHistoryBasedRecommendation, ImprovementOutcome, ImprovementOutcomeStatus, JsonRecord, LandingPageVersion, MarketResearchRun, MarketResearchSummary } from "@/lib/types/adflow";

export default function PairDetailPage() {
  const params = useParams<{ pairId: string }>();
  const pair = useAdLpPair(params.pairId);
  const runs = useAnalysisRuns(params.pairId);
  const history = usePairChangeHistory(pair.data);
  const versions = useLandingPageVersions(pair.data?.landing_page_id ?? "");
  const run = useRunPairAnalysis(params.pairId);
  const decision = useAIAgentDecision();
  const codexTask = useGenerateCodexTask();
  const aiMode = useUiStore((state) => state.analysisAIMode);
  const [researchQuery, setResearchQuery] = useState("");
  const marketResearch = useLatestMarketResearch(params.pairId);
  const runMarketResearch = useRunMarketResearch(params.pairId);
  const outcomes = useImprovementOutcomes(params.pairId);
  const createOutcome = useCreateImprovementOutcome(params.pairId);
  const updateOutcome = useUpdateImprovementOutcome(params.pairId);
  const createOutcomeFromResult = useCreateOutcomeFromAIResult(params.pairId);

  const analyze = async () => {
    try {
      await run.mutateAsync(aiMode);
      toast.success("Analysis completed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed.");
    }
  };

  const latest = runs.data?.[0];
  const insights = latest?.history_insights as AIHistoryBasedRecommendation | undefined;
  const agentResults = useAIAgentResults(insights?.orchestration_run_id);
  const defaultResearchQuery = [
    pair.data?.twitter_ads?.headline,
    pair.data?.landing_pages?.hero_title,
    pair.data?.landing_pages?.target_audience,
  ].filter(Boolean).join(" ");
  const runResearch = async () => {
    try {
      await runMarketResearch.mutateAsync({
        projectId: pair.data?.project_id,
        query: researchQuery.trim() || defaultResearchQuery || pair.data?.name || "market research",
      });
      toast.success("Market research completed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Market research failed.");
    }
  };

  if (pair.isLoading || runs.isLoading || history.isLoading || versions.isLoading || agentResults.isLoading) return <PageSkeleton />;
  if (pair.isError || !pair.data) return <ErrorState />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={pair.data.name}
        description="Inspect the registered ad, LP, history, and pair-level AI recommendations."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{aiMode === "openai_only" ? "OpenAI only" : "Multi AI"}</Badge>
            <Button asChild variant="outline">
              <a href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                AI settings
              </a>
            </Button>
            <Button onClick={analyze} disabled={run.isPending}>
              <Play className="mr-2 h-4 w-4" />
              {run.isPending ? "Running..." : "Run analysis"}
            </Button>
          </div>
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
      {insights?.ai_mode ? (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="font-medium">Active analysis route</div>
            <Badge variant="outline">{insights.ai_mode === "openai_only" ? "OpenAI API only" : "AI OS router"}</Badge>
          </div>
        </Card>
      ) : null}

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="runs">Analysis</TabsTrigger>
          <TabsTrigger value="comparison">AI Comparison</TabsTrigger>
          <TabsTrigger value="market">Market Research</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
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
            isCreatingOutcome={createOutcomeFromResult.isPending}
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
            onOutcomeDraft={async (resultId) => {
              try {
                await createOutcomeFromResult.mutateAsync(resultId);
                toast.success("Outcome draft created.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Outcome draft creation failed.");
              }
            }}
          />
        </TabsContent>
        <TabsContent value="market">
          <MarketResearchPanel
            isLoading={marketResearch.isLoading}
            isRunning={runMarketResearch.isPending}
            query={researchQuery}
            run={marketResearch.data}
            onQueryChange={setResearchQuery}
            onRun={runResearch}
            placeholder={defaultResearchQuery || pair.data.name}
          />
        </TabsContent>
        <TabsContent value="outcomes">
          <OutcomesPanel
            isLoading={outcomes.isLoading}
            isCreating={createOutcome.isPending}
            isUpdating={updateOutcome.isPending}
            outcomes={outcomes.data ?? []}
            projectId={pair.data.project_id}
            pairId={params.pairId}
            onCreate={async (payload) => {
              try {
                await createOutcome.mutateAsync(payload);
                toast.success("Outcome created.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Outcome creation failed.");
              }
            }}
            onUpdate={async (outcomeId, payload) => {
              try {
                await updateOutcome.mutateAsync({ outcomeId, payload });
                toast.success("Outcome updated.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Outcome update failed.");
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
                {typeof insights.market_alignment_score === "number" ? (
                  <div className="rounded-md border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">Market alignment</div>
                      <Badge variant="outline">{insights.market_alignment_score}/100</Badge>
                    </div>
                    {insights.market_fit_analysis ? (
                      <p className="mt-2 text-muted-foreground">{insights.market_fit_analysis}</p>
                    ) : null}
                  </div>
                ) : null}
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
                {insights.market_opportunities?.length ? (
                  <div>
                    <div className="font-medium">Market opportunities</div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {insights.market_opportunities.map((item) => (
                        <div className="rounded-md border border-border p-3" key={item}>{item}</div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {insights.outcome_insights?.length ? (
                  <div>
                    <div className="font-medium">Outcome learnings</div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {insights.outcome_insights.map((item) => (
                        <div className="rounded-md border border-border p-3" key={`${item.finding}-${item.evidence}`}>
                          <div className="font-medium">{item.finding}</div>
                          <p className="mt-1 text-muted-foreground">{item.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
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
  isCreatingOutcome,
  onDecision,
  onCodexTask,
  onOutcomeDraft,
}: {
  results: AIAgentResult[];
  messageMatchScore: number;
  isDeciding: boolean;
  isGeneratingTask: boolean;
  isCreatingOutcome: boolean;
  onDecision: (resultId: string, status: AIAgentResult["decision_status"]) => Promise<void>;
  onCodexTask: (resultId: string) => Promise<void>;
  onOutcomeDraft: (resultId: string) => Promise<void>;
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
              <Button size="sm" variant="outline" disabled={isCreatingOutcome || result.decision_status !== "apply_ready"} onClick={() => onOutcomeDraft(result.id)}>
                Create Outcome Draft
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function MarketResearchPanel({
  run,
  query,
  placeholder,
  isLoading,
  isRunning,
  onQueryChange,
  onRun,
}: {
  run?: MarketResearchRun;
  query: string;
  placeholder: string;
  isLoading: boolean;
  isRunning: boolean;
  onQueryChange: (value: string) => void;
  onRun: () => Promise<void>;
}) {
  if (isLoading) return <PageSkeleton />;
  const summary = (run?.summary ?? {}) as MarketResearchSummary;
  const competitors = summary.competitor_research ?? [];
  const painPoints = summary.social_research?.pain_points ?? summary.main_pain_points ?? [];
  const opportunities = summary.opportunities ?? [];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <Input
              aria-label="Market research query"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={placeholder}
              value={query}
            />
          </div>
          <Button onClick={onRun} disabled={isRunning}>
            <Search className="mr-2 h-4 w-4" />
            {isRunning ? "Researching..." : "Run research"}
          </Button>
        </div>
      </Card>

      {run ? (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-4 xl:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">Overview</div>
                <Badge variant="outline">{run.status}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {summary.market_overview ?? "No overview was generated."}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(summary.main_pain_points ?? []).slice(0, 4).map((item) => (
                  <div className="rounded-md border border-border p-3 text-sm" key={item}>{item}</div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <div className="font-semibold">Research run</div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div>Query: {run.query}</div>
                <div>Sources: {run.sources.length}</div>
                <div>Insights: {run.insights.length}</div>
                <div>Created: {new Date(run.created_at).toLocaleString()}</div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ResearchSection title="Pain Points" items={painPoints} badge="Directional" />
            <ResearchSection title="Opportunities" items={opportunities} badge="Hypothesis" />
            <ResearchSection title="Warnings" items={summary.warnings ?? []} badge="Guardrails" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Competitors</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {competitors.length ? competitors.map((item) => (
                  <div className="rounded-md border border-border p-4 text-sm" key={item.name ?? item.description}>
                    <div className="font-medium">{item.name ?? "Competitor"}</div>
                    <div className="mt-2 text-muted-foreground">{item.positioning ?? item.description ?? "-"}</div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Strengths</div>
                        <div>{(item.strengths ?? []).join(", ") || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Weaknesses</div>
                        <div>{(item.weaknesses ?? []).join(", ") || "-"}</div>
                      </div>
                    </div>
                  </div>
                )) : <EmptyState title="No competitors" description="Run research to collect competitor materials." />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" />
                  Source Signals
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {run.sources.slice(0, 8).map((source) => (
                  <div className="rounded-md border border-border p-3 text-sm" key={source.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{source.title}</div>
                      <Badge variant="outline">{source.source_type}</Badge>
                    </div>
                    <p className="mt-2 text-muted-foreground">{source.content}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Relevance: {Math.round(source.relevance_score)} / Sentiment: {source.sentiment ?? "unknown"}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <EmptyState title="No market research" description="Run research to collect pains, competitors, search intent, and positioning gaps before analysis." />
      )}
    </div>
  );
}

function OutcomesPanel({
  outcomes,
  pairId,
  projectId,
  isLoading,
  isCreating,
  isUpdating,
  onCreate,
  onUpdate,
}: {
  outcomes: ImprovementOutcome[];
  pairId: string;
  projectId?: string | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  onCreate: (payload: {
    project_id?: string | null;
    ad_lp_pair_id: string;
    title: string;
    description?: string | null;
    before_metrics?: JsonRecord;
    after_metrics?: JsonRecord;
  }) => Promise<void>;
  onUpdate: (outcomeId: string, payload: Partial<{
    before_metrics: JsonRecord;
    after_metrics: JsonRecord;
    outcome_status: ImprovementOutcomeStatus;
    implemented_at: string | null;
    measured_at: string | null;
    learning_notes: string | null;
  }>) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [beforeMetrics, setBeforeMetrics] = useState(defaultMetricsText());
  const [afterMetrics, setAfterMetrics] = useState(defaultMetricsText());
  const [learningNotes, setLearningNotes] = useState("");

  if (isLoading) return <PageSkeleton />;

  const selected = outcomes.find((item) => item.id === editingId);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Outcome title" />
          <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
          <Button
            disabled={isCreating || !title.trim()}
            onClick={() => onCreate({
              project_id: projectId ?? null,
              ad_lp_pair_id: pairId,
              title,
              description,
              before_metrics: parseMetrics(beforeMetrics),
              after_metrics: parseMetrics(afterMetrics),
            })}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Create outcome
          </Button>
        </div>
      </Card>

      {selected ? (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">Edit outcome metrics</div>
            <Badge variant="outline">{selected.outcome_status}</Badge>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Before metrics JSON</span>
              <textarea className="min-h-40 rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={beforeMetrics} onChange={(event) => setBeforeMetrics(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">After metrics JSON</span>
              <textarea className="min-h-40 rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={afterMetrics} onChange={(event) => setAfterMetrics(event.target.value)} />
            </label>
          </div>
          <Input className="mt-3" value={learningNotes} onChange={(event) => setLearningNotes(event.target.value)} placeholder="Learning notes" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              disabled={isUpdating}
              onClick={() => onUpdate(selected.id, {
                before_metrics: parseMetrics(beforeMetrics),
                after_metrics: parseMetrics(afterMetrics),
                outcome_status: "measured",
                measured_at: new Date().toISOString(),
                learning_notes: learningNotes || selected.learning_notes,
              })}
            >
              Save measured outcome
            </Button>
            <Button variant="outline" onClick={() => setEditingId(null)}>Close</Button>
          </div>
        </Card>
      ) : null}

      {outcomes.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {outcomes.map((outcome) => {
            const delta = outcome.metric_delta as Record<string, unknown>;
            return (
              <Card key={outcome.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{outcome.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{outcome.description ?? "No description"}</p>
                  </div>
                  <Badge variant={outcome.outcome_status === "negative" ? "warning" : "secondary"}>{outcome.outcome_status}</Badge>
                </div>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <MetricDelta label="CTR delta" value={delta.ctr_delta} />
                  <MetricDelta label="CVR delta" value={delta.cvr_delta} />
                  <MetricDelta label="Bounce delta" value={delta.bounce_rate_delta} />
                </div>
                <div className="mt-4 grid gap-1 text-xs text-muted-foreground">
                  <div>Implemented: {outcome.implemented_at ? new Date(outcome.implemented_at).toLocaleString() : "-"}</div>
                  <div>Measured: {outcome.measured_at ? new Date(outcome.measured_at).toLocaleString() : "-"}</div>
                </div>
                {outcome.outcome_summary ? <p className="mt-3 text-sm text-muted-foreground">{outcome.outcome_summary}</p> : null}
                {outcome.learning_notes ? <p className="mt-2 text-sm">{outcome.learning_notes}</p> : null}
                <Button
                  className="mt-4"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(outcome.id);
                    setBeforeMetrics(JSON.stringify(outcome.before_metrics ?? {}, null, 2));
                    setAfterMetrics(JSON.stringify(outcome.after_metrics ?? {}, null, 2));
                    setLearningNotes(outcome.learning_notes ?? "");
                  }}
                >
                  Edit metrics
                </Button>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No outcomes" description="Create an outcome draft after implementation, then save before and after metrics." />
      )}
    </div>
  );
}

function MetricDelta({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{typeof value === "number" ? value : "-"}</div>
    </div>
  );
}

function defaultMetricsText() {
  return JSON.stringify({
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
    ctr: 0,
    cpc: 0,
    cvr: 0,
    bounce_rate: 0,
    session_duration: 0,
    scroll_depth: 0,
  }, null, 2);
}

function parseMetrics(value: string): JsonRecord {
  try {
    const parsed = JSON.parse(value) as JsonRecord;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function ResearchSection({ title, items, badge }: { title: string; items: string[]; badge: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold">{title}</div>
        <Badge variant="outline">{badge}</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {items.length ? items.map((item) => (
          <div className="rounded-md border border-border p-3 text-sm" key={item}>{item}</div>
        )) : <div className="text-sm text-muted-foreground">No items yet.</div>}
      </div>
    </Card>
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
