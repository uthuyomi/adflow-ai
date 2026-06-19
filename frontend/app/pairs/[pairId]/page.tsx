"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { XAdsPublishDraftDialog } from "@/components/x-ads/XAdsPublishDraftDialog";
import { useAdLpPair } from "@/hooks/use-ad-lp-pairs";
import { useAnalysisRuns, useRunPairAnalysis } from "@/hooks/use-analysis-runs";
import { usePairChangeHistory } from "@/hooks/use-change-history";
import { useCreateImprovementOutcome, useCreateOutcomeFromAIResult, useImprovementOutcomes, useUpdateImprovementOutcome } from "@/hooks/use-improvement-outcomes";
import { useLandingPageVersions } from "@/hooks/use-landing-pages";
import { useDemandEvidence, useDemandMarketSize, useDemandOutcomeLearning, useDemandSearchDemand, useDemandSnapshots, useDemandSolutionFits, useDemandSourceRuns, useDemandValidations, useLatestDemandIntelligence, useRebuildDemandOutcomeLearning, useRunDemandIntelligence, useRunSolutionFit } from "@/hooks/use-demand-intelligence";
import { useAIAgentDecision, useAIAgentResults, useGenerateCodexTask } from "@/hooks/use-orchestration";
import { useI18n } from "@/hooks/use-i18n";
import { useUiStore } from "@/lib/store";
import { showActionableError } from "@/lib/api/errors";
import type { AIAgentResult, AIHistoryBasedRecommendation, DemandIntelligenceRun, DemandIntelligenceSignal, DemandIntelligenceSummary, DemandMarketSizeEstimate, DemandOutcomeLearningLink, DemandSearchSignal, DemandSignalSnapshot, DemandSignalValidation, DemandSolutionFit, DemandSourceRun, ImprovementOutcome, ImprovementOutcomeStatus, JsonRecord, LandingPageVersion } from "@/lib/types/adflow";

export default function PairDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ pairId: string }>();
  const router = useRouter();
  const pair = useAdLpPair(params.pairId);
  const runs = useAnalysisRuns(params.pairId);
  const history = usePairChangeHistory(pair.data);
  const versions = useLandingPageVersions(pair.data?.landing_page_id ?? "");
  const run = useRunPairAnalysis(params.pairId);
  const decision = useAIAgentDecision();
  const codexTask = useGenerateCodexTask();
  const aiMode = useUiStore((state) => state.analysisAIMode);
  const [demandQuery, setDemandQuery] = useState("");
  const [xAdsDraftResult, setXAdsDraftResult] = useState<AIAgentResult | null>(null);
  const demandIntelligence = useLatestDemandIntelligence(params.pairId);
  const runDemandIntelligence = useRunDemandIntelligence(params.pairId);
  const demandRunId = demandIntelligence.data?.id;
  const demandSourceRuns = useDemandSourceRuns(demandRunId);
  const demandValidations = useDemandValidations(demandRunId);
  const demandSolutionFits = useDemandSolutionFits(demandRunId);
  const demandSnapshots = useDemandSnapshots(demandRunId);
  const demandEvidence = useDemandEvidence(demandRunId);
  const demandSearchDemand = useDemandSearchDemand(demandRunId);
  const demandMarketSize = useDemandMarketSize(demandRunId);
  const demandOutcomeLearning = useDemandOutcomeLearning(demandRunId);
  const runSolutionFit = useRunSolutionFit(demandRunId);
  const rebuildOutcomeLearning = useRebuildDemandOutcomeLearning(demandRunId);
  const outcomes = useImprovementOutcomes(params.pairId);
  const createOutcome = useCreateImprovementOutcome(params.pairId);
  const updateOutcome = useUpdateImprovementOutcome(params.pairId);
  const createOutcomeFromResult = useCreateOutcomeFromAIResult(params.pairId);
  const [detailMode, setDetailMode] = useState<"beginner" | "advanced">("beginner");

  const analyze = async () => {
    try {
      await run.mutateAsync(aiMode);
      toast.success("Analysis completed.");
    } catch (error) {
      showActionableError(error, "Analysis failed.", t("pricing.choosePlan"));
    }
  };

  const latest = runs.data?.[0];
  const insights = latest?.history_insights as AIHistoryBasedRecommendation | undefined;
  const agentResults = useAIAgentResults(insights?.orchestration_run_id);
  const defaultDemandQuery = [
    pair.data?.twitter_ads?.headline,
    pair.data?.landing_pages?.hero_title,
    pair.data?.landing_pages?.target_audience,
  ].filter(Boolean).join(" ");
  const runDemand = async () => {
    try {
      await runDemandIntelligence.mutateAsync({
        projectId: pair.data?.project_id,
        query: demandQuery.trim() || defaultDemandQuery || pair.data?.name || "demand intelligence",
      });
      toast.success("Demand intelligence completed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Demand intelligence failed.");
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
            <div className="flex gap-2">
              <Badge variant={latest?.provider_type === "REAL" ? "secondary" : "warning"}>
                {latest?.provider_type === "REAL" ? "実AI結果" : "モック結果"}
              </Badge>
              <Badge variant="outline">{insights.ai_mode === "openai_only" ? "OpenAI API only" : "AI Review Center router"}</Badge>
            </div>
          </div>
          {latest?.failure_reason ? <p className="mt-2 text-xs text-warning">{latest.failure_reason}</p> : null}
        </Card>
      ) : null}

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">{t("pair.beginner.title")}</div>
            <p className="mt-1 text-sm text-muted-foreground">{t("pair.beginner.copy")}</p>
          </div>
          <div className="inline-flex rounded-md border border-border p-1">
            <Button size="sm" variant={detailMode === "beginner" ? "default" : "ghost"} onClick={() => setDetailMode("beginner")}>
              {t("pair.mode.beginner")}
            </Button>
            <Button size="sm" variant={detailMode === "advanced" ? "default" : "ghost"} onClick={() => setDetailMode("advanced")}>
              {t("pair.mode.advanced")}
            </Button>
          </div>
        </div>
      </Card>

      {detailMode === "beginner" ? (
        <BeginnerPairView latest={latest} insights={insights} outcomes={outcomes.data ?? []} onAnalyze={analyze} isAnalyzing={run.isPending} />
      ) : (
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="runs">Analysis</TabsTrigger>
          <TabsTrigger value="comparison">AI Comparison</TabsTrigger>
          <TabsTrigger value="demand">Demand Intelligence</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="orchestration">AI Review Center</TabsTrigger>
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
                const task = await codexTask.mutateAsync(resultId);
                toast.success("Codex task prompt generated.");
                router.push(`/codex-tasks/${task.id}`);
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
            onXAdsDraft={(result) => setXAdsDraftResult(result)}
          />
          <XAdsPublishDraftDialog open={Boolean(xAdsDraftResult)} onOpenChange={(open) => !open && setXAdsDraftResult(null)} result={xAdsDraftResult} />
        </TabsContent>
        <TabsContent value="demand">
          <DemandIntelligencePanel
            isLoading={demandIntelligence.isLoading}
            isRunning={runDemandIntelligence.isPending}
            query={demandQuery}
            run={demandIntelligence.data}
            sourceRuns={demandSourceRuns.data ?? []}
            validations={demandValidations.data ?? []}
            solutionFits={demandSolutionFits.data ?? []}
            snapshots={demandSnapshots.data ?? []}
            evidenceSignals={demandEvidence.data ?? []}
            searchSignals={demandSearchDemand.data ?? []}
            marketEstimates={demandMarketSize.data ?? []}
            outcomeLearningLinks={demandOutcomeLearning.data ?? []}
            isRunningSolutionFit={runSolutionFit.isPending}
            isRebuildingOutcomeLearning={rebuildOutcomeLearning.isPending}
            onQueryChange={setDemandQuery}
            onRun={runDemand}
            onRunSolutionFit={async (fitTargetText) => {
              try {
                await runSolutionFit.mutateAsync({ fitTargetType: "app_idea", fitTargetText });
                toast.success("Solution fit completed.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Solution fit failed.");
              }
            }}
            onRebuildOutcomeLearning={async () => {
              try {
                await rebuildOutcomeLearning.mutateAsync();
                toast.success("Outcome learning rebuilt.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Outcome learning rebuild failed.");
              }
            }}
            placeholder={defaultDemandQuery || pair.data.name}
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
                      <Badge className="mt-2" variant={result.provider_type === "REAL" ? "secondary" : "warning"}>
                        {result.provider_type === "REAL" ? "実AI結果" : "モック結果"}
                      </Badge>
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
            <EmptyState title="No orchestration log" description="Run analysis to route this pair through specialized AI review desks." />
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
      )}
    </div>
  );
}

function BeginnerPairView({
  latest,
  insights,
  outcomes,
  onAnalyze,
  isAnalyzing,
}: {
  latest: {
    score?: number | null;
    risk_level?: string | null;
    ad_improvements?: unknown;
    lp_improvements?: unknown;
    review_result?: unknown;
  } | undefined;
  insights: AIHistoryBasedRecommendation | undefined;
  outcomes: ImprovementOutcome[];
  onAnalyze: () => Promise<void>;
  isAnalyzing: boolean;
}) {
  const { t } = useI18n();
  const recommendations = [
    ...extractRecommendationText(latest?.ad_improvements),
    ...extractRecommendationText(latest?.lp_improvements),
    ...(insights?.ad_recommendations ?? []).map((item) => item.suggested_value),
    ...(insights?.lp_recommendations ?? []).map((item) => item.suggested_value),
  ].filter(Boolean).slice(0, 6);
  const risks = [
    latest?.risk_level ? `Risk level: ${latest.risk_level}` : "",
    ...extractRecommendationText(latest?.review_result),
  ].filter((item): item is string => Boolean(item)).slice(0, 4);
  const strengths = [
    typeof latest?.score === "number" && latest.score >= 70 ? "Current pair has a strong overall analysis score." : "",
    insights?.overall_diagnosis,
    insights?.market_fit_analysis,
  ].filter((item): item is string => Boolean(item)).slice(0, 4);
  const priority = recommendations.length ? recommendations.slice(0, 3) : [t("pair.noRecommendations")];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">{t("pair.latestResult")}</div>
          <div className="mt-2 text-3xl font-semibold">{typeof latest?.score === "number" ? latest.score : "-"}</div>
          <p className="mt-2 text-sm text-muted-foreground">{latest ? `Risk: ${latest.risk_level ?? "unknown"}` : t("pair.noLatest")}</p>
        </Card>
        <Card className="p-4 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{t("pair.topRecommendations")}</div>
              <p className="mt-1 text-sm text-muted-foreground">{recommendations.length ? recommendations[0] : t("pair.noRecommendations")}</p>
            </div>
            <Button onClick={onAnalyze} disabled={isAnalyzing}>
              <Play className="mr-2 h-4 w-4" />
              {isAnalyzing ? "Running..." : "Run analysis"}
            </Button>
          </div>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryList title={t("pair.visual.strengths")} items={strengths.length ? strengths : [t("pair.noLatest")]} />
        <SummaryList title={t("pair.visual.risks")} items={risks.length ? risks : ["No major review risks surfaced yet."]} />
        <SummaryList title={t("pair.visual.recommendations")} items={recommendations.length ? recommendations : [t("pair.noRecommendations")]} />
        <SummaryList title={t("pair.visual.priority")} items={priority} />
      </div>
      <Card className="p-4">
        <div className="font-semibold">{t("pair.recentOutcomes")}</div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {outcomes.slice(0, 3).map((outcome) => (
            <div className="rounded-md border border-border p-3 text-sm" key={outcome.id}>
              <div className="font-medium">{outcome.title}</div>
              <p className="mt-1 text-muted-foreground">{outcome.outcome_summary ?? outcome.outcome_status}</p>
            </div>
          ))}
          {!outcomes.length ? <div className="text-sm text-muted-foreground">{t("pair.noOutcomes")}</div> : null}
        </div>
      </Card>
    </div>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="p-4">
      <div className="font-semibold">{title}</div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div className="rounded-md border border-border p-3 text-sm" key={item}>
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}

function extractRecommendationText(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") return [item];
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return [record.suggested_value, record.reason, record.summary].filter((text): text is string => typeof text === "string");
      }
      return [];
    });
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.values(record).filter((text): text is string => typeof text === "string").slice(0, 4);
  }
  return typeof value === "string" ? [value] : [];
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
  onXAdsDraft,
}: {
  results: AIAgentResult[];
  messageMatchScore: number;
  isDeciding: boolean;
  isGeneratingTask: boolean;
  isCreatingOutcome: boolean;
  onDecision: (resultId: string, status: AIAgentResult["decision_status"]) => Promise<void>;
  onCodexTask: (resultId: string) => Promise<void>;
  onOutcomeDraft: (resultId: string) => Promise<void>;
  onXAdsDraft: (result: AIAgentResult) => void;
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
                <Badge className="mt-2" variant={result.provider_type === "REAL" ? "secondary" : "warning"}>
                  {result.provider_type === "REAL" ? "実AI結果" : "モック結果"}
                </Badge>
              </div>
              <Badge variant={result.decision_status === "APPLY_READY" ? "warning" : "secondary"}>{result.decision_status}</Badge>
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
            {result.failure_reason ? <p className="mt-2 text-xs text-warning">{result.failure_reason}</p> : null}
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
              {(["APPROVED", "REJECTED", "APPLY_READY"] as const).map((status) => (
                <Button key={status} size="sm" variant="outline" disabled={isDeciding} onClick={() => onDecision(result.id, status)}>
                  {status}
                </Button>
              ))}
              <Button size="sm" disabled={isGeneratingTask || result.decision_status !== "APPLY_READY"} onClick={() => onCodexTask(result.id)}>
                Generate Codex Task
              </Button>
              <Button size="sm" variant="outline" disabled={isCreatingOutcome || result.decision_status !== "APPLY_READY"} onClick={() => onOutcomeDraft(result.id)}>
                Create Outcome Draft
              </Button>
              <Button size="sm" disabled={result.decision_status !== "APPLY_READY"} onClick={() => onXAdsDraft(result)}>
                Create X Ads Draft
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function DemandIntelligencePanel({
  run,
  sourceRuns,
  validations,
  solutionFits,
  snapshots,
  evidenceSignals,
  searchSignals,
  marketEstimates,
  outcomeLearningLinks,
  query,
  placeholder,
  isLoading,
  isRunning,
  isRunningSolutionFit,
  isRebuildingOutcomeLearning,
  onQueryChange,
  onRun,
  onRunSolutionFit,
  onRebuildOutcomeLearning,
}: {
  run?: DemandIntelligenceRun;
  sourceRuns: DemandSourceRun[];
  validations: DemandSignalValidation[];
  solutionFits: DemandSolutionFit[];
  snapshots: DemandSignalSnapshot[];
  evidenceSignals: DemandIntelligenceSignal[];
  searchSignals: DemandSearchSignal[];
  marketEstimates: DemandMarketSizeEstimate[];
  outcomeLearningLinks: DemandOutcomeLearningLink[];
  query: string;
  placeholder: string;
  isLoading: boolean;
  isRunning: boolean;
  isRunningSolutionFit: boolean;
  isRebuildingOutcomeLearning: boolean;
  onQueryChange: (value: string) => void;
  onRun: () => Promise<void>;
  onRunSolutionFit: (fitTargetText: string) => Promise<void>;
  onRebuildOutcomeLearning: () => Promise<void>;
}) {
  const [fitText, setFitText] = useState("");
  if (isLoading) return <PageSkeleton />;
  const summary = (run?.summary ?? {}) as DemandIntelligenceSummary;
  const painClusters = summary.top_pain_clusters ?? [];
  const desireClusters = summary.top_desire_clusters ?? [];
  const demandSignals = summary.top_demand_signals ?? [];
  const opportunities = summary.opportunities ?? [];
  const features = summary.recommended_features ?? [];
  const positioning = summary.recommended_positioning;
  const lpContext = summary.lp_improvement_context;
  const summaryEvidence = summary.evidence_summary ?? [];
  const realEvidence = ((summary.real_evidence_summary as JsonRecord | undefined)?.sources as JsonRecord[] | undefined) ?? [];
  const demandScore = (summary.demand_score_summary as JsonRecord | undefined) ?? {};
  const discoveredCompetitors = ((summary.competitor_discovery_summary as JsonRecord | undefined)?.competitors as JsonRecord[] | undefined) ?? [];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <Input
              aria-label="Demand intelligence query"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={placeholder}
              value={query}
            />
          </div>
          <Button onClick={onRun} disabled={isRunning}>
            <Search className="mr-2 h-4 w-4" />
            {isRunning ? "Scanning..." : "Run demand scan"}
          </Button>
        </div>
      </Card>

      {run ? (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-4 xl:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">Demand Intelligence Overview</div>
                <Badge variant="outline">{run.status}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {summary.overview ?? "No overview was generated."}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {demandSignals.slice(0, 4).map((item) => (
                  <div className="rounded-md border border-border p-3 text-sm" key={item.id}>
                    <div className="font-medium">{item.name}</div>
                    <div className="mt-1 text-muted-foreground">Score {item.demand_signal_score} / {item.trend}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <div className="font-semibold">Run metadata</div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div>Query: {run.query}</div>
                <div>Signals: {run.signals.length}</div>
                <div>Clusters: {run.clusters.length}</div>
                <div>Real evidence: {String((summary.real_evidence_summary as JsonRecord | undefined)?.count ?? 0)}</div>
                <div>Demand score: {String(demandScore.score ?? "-")}</div>
                <div>Created: {new Date(run.created_at).toLocaleString()}</div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ClusterSection title="Top Pain Clusters" clusters={painClusters} />
            <ClusterSection title="Top Desire Clusters" clusters={desireClusters} />
            <ResearchSection title="Guardrails" items={summary.guardrails ?? []} badge="Required" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <SourceStatusPanel sourceRuns={sourceRuns} />
            <SignalValidationPanel validations={validations} />
            <SolutionFitPanel
              fitText={fitText}
              isRunning={isRunningSolutionFit}
              onFitTextChange={setFitText}
              onRunSolutionFit={() => onRunSolutionFit(fitText)}
              solutionFits={solutionFits}
            />
            <DemandMonitoringPanel snapshots={snapshots} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <SearchDemandPanel searchSignals={searchSignals} summary={summary.search_demand_summary as JsonRecord | undefined} />
            <MarketSizePanel estimates={marketEstimates} summary={summary.market_size_summary as JsonRecord | undefined} />
            <OutcomeLearningPanel
              isRebuilding={isRebuildingOutcomeLearning}
              links={outcomeLearningLinks}
              onRebuild={onRebuildOutcomeLearning}
              summary={summary.outcome_learning_summary as JsonRecord | undefined}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Competitor Gaps</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {(summary.competitor_gaps ?? []).length ? summary.competitor_gaps.map((item) => (
                  <div className="rounded-md border border-border p-4 text-sm" key={String(item.name)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{String(item.name ?? "Gap")}</div>
                      <Badge variant="outline">{String(item.gap_score ?? "-")}</Badge>
                    </div>
                    <div className="mt-2 text-muted-foreground">{(item.competitor_weaknesses as string[] | undefined)?.join(", ") || "-"}</div>
                  </div>
                )) : <EmptyState title="No competitor gaps" description="Run demand intelligence to collect unresolved competitor gaps." />}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Discovered Competitors</CardTitle></CardHeader>
              <CardContent className="grid gap-3">
                {discoveredCompetitors.length ? discoveredCompetitors.slice(0, 10).map((item) => (
                  <a className="rounded-md border border-border p-3 text-sm hover:bg-muted" href={String(item.source_url)} key={String(item.domain)} rel="noreferrer" target="_blank">
                    <div className="font-medium">{String(item.name)}</div>
                    <div className="mt-1 text-muted-foreground">{String(item.domain)} / {String(item.category)}</div>
                  </a>
                )) : <EmptyState title="No evidence-backed competitors" description="No competitor domains were found in real evidence." />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" />
                  Opportunity Discovery
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {opportunities.slice(0, 5).map((item) => (
                  <div className="rounded-md border border-border p-3 text-sm" key={item.name}>
                    <div className="font-medium">{item.name}</div>
                    <p className="mt-2 text-muted-foreground">{item.description}</p>
                    <div className="mt-2 text-xs text-muted-foreground">{item.expected_value}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ResearchSection title="Recommended Features" items={features.map((item) => `${item.feature_name}: ${item.mvp}`)} badge="Feature" />
            <ResearchSection title="Recommended Positioning" items={[positioning?.recommended_position, ...(positioning?.key_messages ?? [])].filter(Boolean) as string[]} badge="Positioning" />
            <ResearchSection title="Ad Appeal Hooks" items={(summary.ad_appeals ?? []).flatMap((item) => item.hooks)} badge="Ad" />
            <ResearchSection title="LP Improvement Context" items={[...(lpContext?.hero_improvements ?? []), ...(lpContext?.cta_improvements ?? []), ...(lpContext?.section_ideas ?? [])]} badge="LP" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Real Evidence and Citations</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {realEvidence.map((item) => (
                <a className="rounded-md border border-border p-3 text-sm hover:bg-muted" href={String(item.source_url)} key={`${String(item.connector)}-${String(item.source_url)}`} rel="noreferrer" target="_blank">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{String(item.title)}</div>
                    <div className="flex gap-2"><Badge variant="secondary">実データ</Badge><Badge variant="outline">{String(item.connector)}</Badge></div>
                  </div>
                  <p className="mt-2 text-muted-foreground">{String(item.quote)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Relevance: {String(item.relevance_score)}</p>
                </a>
              ))}
              {!realEvidence.length ? <EmptyState title="No real evidence" description="The report cannot make an evidence-backed demand claim until a real connector returns sources." /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cluster Evidence Mapping</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {summaryEvidence.length ? summaryEvidence.slice(0, 12).map((item) => (
                <div className="rounded-md border border-border p-3 text-sm" key={String(item.label)}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{String(item.label)}</div>
                    <Badge variant="outline">{String(item.count ?? 0)} signals</Badge>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {((item.signal_indexes as number[] | undefined) ?? []).slice(0, 4).map((index) => {
                      const signal = evidenceSignals[index] ?? run.signals[index];
                      return signal ? (
                        <div className="rounded-md bg-muted p-3" key={`${item.label}-${signal.id}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>{signal.title}</span>
                            <div className="flex gap-2">
                              <Badge variant={signal.data_source_type === "REAL" ? "secondary" : "warning"}>
                                {signal.data_source_type === "REAL" ? "実測値" : "参考推定値"}
                              </Badge>
                              <Badge variant="outline">{signal.source_type}</Badge>
                            </div>
                          </div>
                          <p className="mt-2 text-muted-foreground">{String(signal.metadata?.normalized_text ?? signal.body)}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )) : <EmptyState title="No evidence" description="Run demand intelligence to inspect original signals behind each conclusion." />}
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState title="No demand intelligence" description="Run demand intelligence to collect pains, desires, competitor gaps, demand signals, and evidence before analysis." />
      )}
    </div>
  );
}

function SourceStatusPanel({ sourceRuns }: { sourceRuns: DemandSourceRun[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Source Collection Status</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {sourceRuns.length ? sourceRuns.slice(0, 8).map((sourceRun) => (
          <div className="rounded-md border border-border p-3 text-sm" key={sourceRun.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{sourceRun.connector_key}</div>
              <Badge variant={sourceRun.status === "failed" ? "warning" : "outline"}>{sourceRun.status}</Badge>
            </div>
            <div className="mt-2 text-muted-foreground">
              {sourceRun.source_type} / collected {sourceRun.collected_count} / stored {sourceRun.stored_count}
            </div>
            {sourceRun.error_message ? <p className="mt-2 text-xs text-muted-foreground">{sourceRun.error_message}</p> : null}
          </div>
        )) : <EmptyState title="No source runs" description="Run demand intelligence to inspect connector status." />}
      </CardContent>
    </Card>
  );
}

function SignalValidationPanel({ validations }: { validations: DemandSignalValidation[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Signal Validation</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {validations.length ? validations.slice(0, 8).map((validation) => (
          <div className="rounded-md border border-border p-3 text-sm" key={validation.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{validation.cluster_id ? `Cluster ${validation.cluster_id.slice(0, 8)}` : "Run validation"}</div>
              <Badge variant={validation.validation_score >= 70 ? "secondary" : "outline"}>{validation.validation_score}</Badge>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <div>Sources: {validation.source_diversity} / Confidence: {validation.confidence}</div>
              <div>Noise: {validation.noise_ratio} / Duplicate: {validation.duplicate_ratio}</div>
            </div>
            {validation.bias_warnings.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {validation.bias_warnings.slice(0, 3).map((warning) => <Badge key={warning} variant="outline">{warning}</Badge>)}
              </div>
            ) : null}
          </div>
        )) : <EmptyState title="No validation data" description="Run demand intelligence to score signal quality and evidence strength." />}
      </CardContent>
    </Card>
  );
}

function SolutionFitPanel({
  solutionFits,
  fitText,
  isRunning,
  onFitTextChange,
  onRunSolutionFit,
}: {
  solutionFits: DemandSolutionFit[];
  fitText: string;
  isRunning: boolean;
  onFitTextChange: (value: string) => void;
  onRunSolutionFit: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Solution Fit</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="Solution fit target"
            onChange={(event) => onFitTextChange(event.target.value)}
            placeholder="Describe an app idea, offer, or positioning to test"
            value={fitText}
          />
          <Button disabled={isRunning || !fitText.trim()} onClick={onRunSolutionFit}>
            {isRunning ? "Checking..." : "Run fit"}
          </Button>
        </div>
        {solutionFits.length ? solutionFits.slice(0, 6).map((fit) => (
          <div className="rounded-md border border-border p-3 text-sm" key={fit.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{fit.fit_target_type}</div>
              <Badge variant={fit.fit_score >= 70 ? "secondary" : "outline"}>{fit.fit_score}</Badge>
            </div>
            {fit.matched_pains.length ? <p className="mt-2 text-muted-foreground">Matched: {fit.matched_pains.slice(0, 3).join(", ")}</p> : null}
            {fit.unmatched_pains.length ? <p className="mt-1 text-muted-foreground">Unmatched: {fit.unmatched_pains.slice(0, 3).join(", ")}</p> : null}
          </div>
        )) : <div className="text-sm text-muted-foreground">No solution fit results yet.</div>}
      </CardContent>
    </Card>
  );
}

function DemandMonitoringPanel({ snapshots }: { snapshots: DemandSignalSnapshot[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Demand Monitoring</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {snapshots.length ? snapshots.slice(0, 8).map((snapshot) => (
          <div className="rounded-md border border-border p-3 text-sm" key={snapshot.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{snapshot.trend_status}</div>
              <Badge variant="outline">{snapshot.demand_signal_score}</Badge>
            </div>
            <div className="mt-2 text-muted-foreground">
              Signals {snapshot.signal_count} / 30d growth {snapshot.growth_30d ?? "-"} / Validation {snapshot.validation_score}
            </div>
          </div>
        )) : <EmptyState title="No monitoring snapshots" description="Run demand intelligence to store trend snapshots." />}
      </CardContent>
    </Card>
  );
}

function SearchDemandPanel({ searchSignals, summary }: { searchSignals: DemandSearchSignal[]; summary?: JsonRecord }) {
  const topKeywords = (summary?.top_search_keywords as JsonRecord[] | undefined) ?? [];
  const warnings = (summary?.low_search_warning as string[] | undefined) ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Search Demand</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Indicative score</span>
          <Badge variant="warning">参考推定値</Badge>
          <Badge variant="outline">{String(summary?.search_demand_score ?? "-")}</Badge>
        </div>
        {(topKeywords.length ? topKeywords : searchSignals).slice(0, 5).map((rawItem) => {
          const item = rawItem as Record<string, unknown>;
          const metadata = (item.metadata as Record<string, unknown> | undefined) ?? {};
          return (
          <div className="rounded-md border border-border p-3 text-sm" key={String(item.keyword)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{String(item.keyword)}</div>
              <Badge variant="outline">{String(item.confidence ?? "-")}</Badge>
            </div>
            <div className="mt-2 text-muted-foreground">
              Volume estimate {String(item.volume_estimate ?? item.search_volume_estimate ?? "-")} / score {String(item.score ?? metadata.search_demand_score ?? "-")}
            </div>
          </div>
        );})}
        {warnings.slice(0, 3).map((warning) => <div className="text-xs text-muted-foreground" key={warning}>{warning}</div>)}
        {!topKeywords.length && !searchSignals.length ? <EmptyState title="No search demand" description="Run demand intelligence to create search demand signals." /> : null}
      </CardContent>
    </Card>
  );
}

function MarketSizePanel({ estimates, summary }: { estimates: DemandMarketSizeEstimate[]; summary?: JsonRecord }) {
  const segments = (summary?.promising_segments as JsonRecord[] | undefined) ?? [];
  const warnings = (summary?.small_market_warnings as string[] | undefined) ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Market Size</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Estimate score</span>
          <Badge variant="warning">参考推定値</Badge>
          <Badge variant="outline">{String(summary?.market_size_score ?? "-")}</Badge>
        </div>
        {(segments.length ? segments : estimates).slice(0, 5).map((rawItem) => {
          const item = rawItem as Record<string, unknown>;
          const range = (item.estimated_audience_range as number[] | undefined) ?? [item.estimated_audience_size_min, item.estimated_audience_size_max];
          return (
            <div className="rounded-md border border-border p-3 text-sm" key={String(item.segment_name)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{String(item.segment_name)}</div>
                <Badge variant="outline">{String(item.market_size_score ?? "-")}</Badge>
              </div>
              <div className="mt-2 text-muted-foreground">
                Range {String(range?.[0] ?? "-")} - {String(range?.[1] ?? "-")} / confidence {String(item.confidence ?? "-")}
              </div>
            </div>
          );
        })}
        {warnings.slice(0, 3).map((warning) => <div className="text-xs text-muted-foreground" key={warning}>{warning}</div>)}
        {!segments.length && !estimates.length ? <EmptyState title="No market size estimates" description="Run demand intelligence to create cautious segment estimates." /> : null}
      </CardContent>
    </Card>
  );
}

function OutcomeLearningPanel({
  links,
  summary,
  isRebuilding,
  onRebuild,
}: {
  links: DemandOutcomeLearningLink[];
  summary?: JsonRecord;
  isRebuilding: boolean;
  onRebuild: () => Promise<void>;
}) {
  const positives = (summary?.validated_demand_patterns as string[] | undefined) ?? [];
  const negatives = (summary?.failed_demand_patterns as string[] | undefined) ?? [];
  const nextTests = (summary?.recommended_next_tests as string[] | undefined) ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span>Outcome Learning</span>
          <Button size="sm" variant="outline" disabled={isRebuilding} onClick={onRebuild}>
            {isRebuilding ? "Rebuilding..." : "Rebuild"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="text-sm text-muted-foreground">Linked outcomes: {String(summary?.linked_outcome_count ?? links.length)}</div>
        {[...positives, ...negatives, ...nextTests].slice(0, 6).map((item) => (
          <div className="rounded-md border border-border p-3 text-sm" key={item}>{item}</div>
        ))}
        {links.slice(0, 4).map((link) => (
          <div className="rounded-md bg-muted p-3 text-sm" key={link.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{link.learning_summary ?? "Outcome learning link"}</span>
              <Badge variant={link.learning_status === "negative" ? "warning" : "outline"}>{link.learning_status}</Badge>
            </div>
          </div>
        ))}
        {!links.length && !positives.length && !negatives.length && !nextTests.length ? <EmptyState title="No outcome learning" description="Measured outcomes will be linked back to demand signals here." /> : null}
      </CardContent>
    </Card>
  );
}

function ClusterSection({ title, clusters }: { title: string; clusters: DemandIntelligenceSummary["top_pain_clusters"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {clusters.length ? clusters.slice(0, 5).map((cluster) => (
          <div className="rounded-md border border-border p-3 text-sm" key={cluster.id}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{cluster.name}</div>
              <div className="flex gap-2">
                <Badge variant="warning">参考推定値</Badge>
                <Badge variant="outline">{cluster.demand_signal_score}</Badge>
              </div>
            </div>
            <div className="mt-2 text-muted-foreground">{cluster.category} / {cluster.trend} / {cluster.count} signals</div>
            <div className="mt-2 text-xs text-muted-foreground">{cluster.root_causes.slice(0, 3).join(", ")}</div>
          </div>
        )) : <EmptyState title="No clusters" description="Run demand intelligence to create clusters." />}
      </CardContent>
    </Card>
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
                  <Badge variant={outcome.outcome_status === "FAILED" ? "warning" : "secondary"}>{outcome.outcome_status}</Badge>
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
