"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { BarChart3, Bell, BrainCircuit, ClipboardList, Database, Map, PackageSearch, Play, RefreshCw, Search, Settings, TrendingUp } from "lucide-react";
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
import { useCollectEvidence, useEvidenceByPair, useEvidenceClusters } from "@/hooks/use-evidence";
import { useCreateImprovementOutcome, useCreateOutcomeFromAIResult, useImprovementOutcomes, useUpdateImprovementOutcome } from "@/hooks/use-improvement-outcomes";
import { useLandingPageVersions } from "@/hooks/use-landing-pages";
import { useLatestMarketResearch, useRunMarketResearch } from "@/hooks/use-market-research";
import { useIntelligenceAlerts, useMonitoringRuns, useRunMonitoring, useUpdateIntelligenceAlert } from "@/hooks/use-monitoring";
import { useAIAgentDecision, useAIAgentResults, useGenerateCodexTask } from "@/hooks/use-orchestration";
import { useConvertProductBacklogToCodexTask, useDecideProductBacklogItem, useProductBacklog } from "@/hooks/use-product-backlog";
import { useProductProfile, useUpsertProductProfile } from "@/hooks/use-product-profile";
import { useLatestProductReview, useRunProductReview } from "@/hooks/use-product-review";
import { useGenerateRoadmap, useLatestRoadmap } from "@/hooks/use-roadmap";
import { useLearningPatterns, useRefreshLearningPatterns } from "@/hooks/use-learning-patterns";
import { useUiStore } from "@/lib/store";
import type { AIAgentResult, AIHistoryBasedRecommendation, EvidenceCluster, EvidenceSource, ImprovementOutcome, ImprovementOutcomeStatus, IntelligenceAlert, JsonRecord, LandingPageVersion, LearningPattern, MarketResearchRun, MarketResearchSummary, MonitoringRun, ProductBacklogItem, ProductProfile, ProductReviewRun, ProductRoadmap } from "@/lib/types/adflow";

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
  const [evidenceQuery, setEvidenceQuery] = useState("");
  const [manualEvidence, setManualEvidence] = useState("");
  const [productReviewQuery, setProductReviewQuery] = useState("");
  const [monitoringQuery, setMonitoringQuery] = useState("");
  const [monitoringType, setMonitoringType] = useState("market");
  const [reviewMode, setReviewMode] = useState<"quick" | "standard" | "deep">("standard");
  const [maxEvidenceItems, setMaxEvidenceItems] = useState(500);
  const marketResearch = useLatestMarketResearch(params.pairId);
  const runMarketResearch = useRunMarketResearch(params.pairId);
  const evidence = useEvidenceByPair(params.pairId);
  const clusters = useEvidenceClusters(pair.data?.project_id, params.pairId);
  const collectEvidenceMutation = useCollectEvidence(params.pairId, pair.data?.project_id);
  const latestProductReview = useLatestProductReview(pair.data?.project_id, params.pairId);
  const runProductReviewMutation = useRunProductReview(pair.data?.project_id, params.pairId);
  const productProfile = useProductProfile(pair.data?.project_id);
  const upsertProductProfile = useUpsertProductProfile(pair.data?.project_id);
  const productBacklog = useProductBacklog(pair.data?.project_id);
  const decideBacklog = useDecideProductBacklogItem(pair.data?.project_id);
  const convertBacklog = useConvertProductBacklogToCodexTask(pair.data?.project_id);
  const latestRoadmap = useLatestRoadmap(pair.data?.project_id);
  const generateRoadmap = useGenerateRoadmap(pair.data?.project_id);
  const monitoringRuns = useMonitoringRuns(pair.data?.project_id);
  const intelligenceAlerts = useIntelligenceAlerts(pair.data?.project_id);
  const runMonitoring = useRunMonitoring(pair.data?.project_id, params.pairId);
  const updateAlert = useUpdateIntelligenceAlert(pair.data?.project_id);
  const learningPatterns = useLearningPatterns(pair.data?.project_id);
  const refreshLearning = useRefreshLearningPatterns(pair.data?.project_id);
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
  const collectEvidenceForPair = async () => {
    try {
      await collectEvidenceMutation.mutateAsync({
        query: evidenceQuery.trim() || defaultResearchQuery || pair.data?.name || "product evidence",
        sources: manualEvidence.trim() ? ["manual", "mock", "web_stub"] : ["mock", "web_stub"],
        max_items: maxEvidenceItems,
        manual_items: manualEvidence.trim()
          ? [{ source_type: "manual", title: "Manual evidence paste", content: manualEvidence.trim() }]
          : [],
      });
      toast.success("Evidence collected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Evidence collection failed.");
    }
  };
  const runProductReview = async () => {
    try {
      await runProductReviewMutation.mutateAsync({
        query: productReviewQuery.trim() || defaultResearchQuery || pair.data?.name || "product review",
        review_mode: reviewMode,
        evidence_collection_mode: "manual_or_mock",
        max_evidence_items: maxEvidenceItems,
        manual_evidence_items: manualEvidence.trim()
          ? [{ source_type: "manual", title: "Manual product review evidence", content: manualEvidence.trim() }]
          : [],
      });
      toast.success("Product review completed and backlog candidates were saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Product review failed.");
    }
  };
  const regenerateRoadmap = async () => {
    try {
      await generateRoadmap.mutateAsync({
        product_review_run_id: latestProductReview.data?.id ?? null,
        title: `${pair.data?.name ?? "Product"} roadmap`,
      });
      toast.success("Roadmap generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Roadmap generation failed.");
    }
  };
  const runMonitoringCheck = async () => {
    try {
      await runMonitoring.mutateAsync({
        query: monitoringQuery.trim() || defaultResearchQuery || pair.data?.name || "market monitoring",
        monitoring_type: monitoringType,
        max_evidence_items: maxEvidenceItems,
      });
      toast.success("Monitoring run completed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Monitoring failed.");
    }
  };
  const refreshLearningPatterns = async () => {
    try {
      await refreshLearning.mutateAsync();
      toast.success("Learning patterns refreshed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Learning refresh failed.");
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
              {run.isPending ? "Running..." : "Run Ad Improvement"}
            </Button>
            <Button variant="outline" onClick={runProductReview} disabled={runProductReviewMutation.isPending || !pair.data.project_id}>
              <PackageSearch className="mr-2 h-4 w-4" />
              {runProductReviewMutation.isPending ? "Reviewing..." : "Run Product Review"}
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">High-frequency Growth Loop</div>
              <p className="mt-1 text-sm text-muted-foreground">広告・LP・CTA・訴求の改善を高頻度で分析します。</p>
            </div>
            <Button onClick={analyze} disabled={run.isPending} size="sm">
              <Play className="mr-2 h-4 w-4" />
              Run Ad Improvement
            </Button>
          </div>
        </Card>
        <Card className="p-4">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold">Low-frequency Product Loop</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  外部証拠・競合・不満・機能適合をもとに、低頻度のプロダクト改善候補を作成します。
                </p>
              </div>
              <Button variant="outline" onClick={runProductReview} disabled={runProductReviewMutation.isPending || !pair.data.project_id} size="sm">
                <PackageSearch className="mr-2 h-4 w-4" />
                Run Product Review
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={reviewMode} onChange={(event) => setReviewMode(event.target.value as "quick" | "standard" | "deep")}>
                <option value="quick">quick</option>
                <option value="standard">standard</option>
                <option value="deep">deep</option>
              </select>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={maxEvidenceItems} onChange={(event) => setMaxEvidenceItems(Number(event.target.value))}>
                {[100, 500, 1000, 3000].map((value) => <option value={value} key={value}>{value} evidence items</option>)}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              このレビューは実装指示ではありません。改善候補をBacklogに保存し、優先度を確認してからCodex taskへ変換してください。
            </p>
          </div>
        </Card>
      </div>
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
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="product-review">Product Review</TabsTrigger>
          <TabsTrigger value="product-backlog">Product Backlog</TabsTrigger>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
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
        <TabsContent value="evidence">
          <EvidencePanel
            clusters={clusters.data ?? []}
            evidence={evidence.data ?? []}
            isCollecting={collectEvidenceMutation.isPending}
            isLoading={evidence.isLoading || clusters.isLoading}
            manualEvidence={manualEvidence}
            query={evidenceQuery}
            onCollect={collectEvidenceForPair}
            onManualEvidenceChange={setManualEvidence}
            onQueryChange={setEvidenceQuery}
            placeholder={defaultResearchQuery || pair.data.name}
          />
        </TabsContent>
        <TabsContent value="product-review">
          <div className="space-y-4">
            <ProductProfilePanel
              defaultName={pair.data.name}
              isSaving={upsertProductProfile.isPending}
              profile={productProfile.data ?? undefined}
              projectId={pair.data.project_id}
              onSave={async (payload) => {
                try {
                  await upsertProductProfile.mutateAsync(payload);
                  toast.success("Product profile saved.");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Product profile save failed.");
                }
              }}
            />
            <ProductReviewPanel
              isLoading={latestProductReview.isLoading}
              review={latestProductReview.data}
              clusters={clusters.data ?? []}
            />
          </div>
        </TabsContent>
        <TabsContent value="product-backlog">
          <ProductBacklogPanel
            backlog={productBacklog.data ?? []}
            isLoading={productBacklog.isLoading}
            isDeciding={decideBacklog.isPending}
            isConverting={convertBacklog.isPending}
            onDecision={async (itemId, status) => {
              try {
                await decideBacklog.mutateAsync({ itemId, status, reason: `Marked ${status} from pair detail.` });
                toast.success(`Backlog item marked ${status}.`);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Backlog decision failed.");
              }
            }}
            onConvert={async (itemId) => {
              try {
                await convertBacklog.mutateAsync(itemId);
                toast.success("Codex task prompt created from backlog item.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Codex task conversion failed.");
              }
            }}
          />
        </TabsContent>
        <TabsContent value="roadmap">
          <RoadmapPanel
            isGenerating={generateRoadmap.isPending}
            isLoading={latestRoadmap.isLoading}
            roadmap={latestRoadmap.data}
            onGenerate={regenerateRoadmap}
          />
        </TabsContent>
        <TabsContent value="monitoring">
          <MonitoringPanel
            alerts={intelligenceAlerts.data ?? []}
            isLoading={monitoringRuns.isLoading || intelligenceAlerts.isLoading}
            isRunning={runMonitoring.isPending}
            isUpdating={updateAlert.isPending}
            monitoringType={monitoringType}
            query={monitoringQuery}
            runs={monitoringRuns.data ?? []}
            onMonitoringTypeChange={setMonitoringType}
            onQueryChange={setMonitoringQuery}
            onRun={runMonitoringCheck}
            onUpdateAlert={async (alertId, status) => {
              try {
                await updateAlert.mutateAsync({ alertId, payload: { status } });
                toast.success(`Alert marked ${status}.`);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Alert update failed.");
              }
            }}
          />
        </TabsContent>
        <TabsContent value="learning">
          <LearningPanel
            isLoading={learningPatterns.isLoading}
            isRefreshing={refreshLearning.isPending}
            patterns={learningPatterns.data ?? []}
            onRefresh={refreshLearningPatterns}
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

function EvidencePanel({
  evidence,
  clusters,
  query,
  manualEvidence,
  placeholder,
  isLoading,
  isCollecting,
  onQueryChange,
  onManualEvidenceChange,
  onCollect,
}: {
  evidence: EvidenceSource[];
  clusters: EvidenceCluster[];
  query: string;
  manualEvidence: string;
  placeholder: string;
  isLoading: boolean;
  isCollecting: boolean;
  onQueryChange: (value: string) => void;
  onManualEvidenceChange: (value: string) => void;
  onCollect: () => Promise<void>;
}) {
  if (isLoading) return <PageSkeleton />;
  const sourceCounts = evidence.reduce<Record<string, number>>((acc, item) => {
    acc[item.source_type] = (acc[item.source_type] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} />
          <Button onClick={onCollect} disabled={isCollecting}>
            <Database className="mr-2 h-4 w-4" />
            {isCollecting ? "Collecting..." : "Collect evidence"}
          </Button>
        </div>
        <textarea
          className="mt-3 min-h-28 w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => onManualEvidenceChange(event.target.value)}
          placeholder="Paste manual evidence here when you have user comments, reviews, search snippets, or competitor notes."
          value={manualEvidence}
        />
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Evidence count</div>
          <div className="mt-2 text-2xl font-semibold">{evidence.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Cluster count</div>
          <div className="mt-2 text-2xl font-semibold">{clusters.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Source types</div>
          <div className="mt-2 text-2xl font-semibold">{Object.keys(sourceCounts).length}</div>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top clusters</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {clusters.length ? clusters.slice(0, 8).map((cluster) => (
              <div className="rounded-md border border-border p-3 text-sm" key={cluster.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{cluster.label}</div>
                  <Badge variant="outline">{cluster.cluster_type}</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">{cluster.description}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  Evidence: {cluster.evidence_count} / Confidence: {Math.round((cluster.confidence ?? 0) * 100)}%
                </div>
              </div>
            )) : <EmptyState title="No clusters" description="Collect evidence to generate pain, intent, competitor, and review clusters." />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Representative evidence</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {evidence.length ? evidence.slice(0, 10).map((item) => (
              <div className="rounded-md border border-border p-3 text-sm" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{item.title ?? item.source_type}</div>
                  <Badge variant="outline">{item.source_type}</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">{item.normalized_content ?? item.raw_content}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  Relevance: {Math.round(item.relevance_score ?? 0)} / Sentiment: {item.sentiment ?? "unknown"}
                </div>
              </div>
            )) : <EmptyState title="No evidence" description="Collect mock, stub, or manual evidence to build a review corpus." />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProductProfilePanel({
  profile,
  projectId,
  defaultName,
  isSaving,
  onSave,
}: {
  profile?: ProductProfile;
  projectId?: string | null;
  defaultName: string;
  isSaving: boolean;
  onSave: (payload: {
    project_id: string;
    product_name: string;
    product_url?: string | null;
    short_description?: string | null;
    target_users?: string | null;
    core_value?: string | null;
    current_features?: string[];
    pricing_model?: string | null;
    current_stage?: string | null;
    positioning_notes?: string | null;
    known_constraints?: string | null;
    do_not_build?: string[];
  }) => Promise<void>;
}) {
  const [productName, setProductName] = useState(profile?.product_name ?? defaultName);
  const [productUrl, setProductUrl] = useState(profile?.product_url ?? "");
  const [shortDescription, setShortDescription] = useState(profile?.short_description ?? "");
  const [targetUsers, setTargetUsers] = useState(profile?.target_users ?? "");
  const [coreValue, setCoreValue] = useState(profile?.core_value ?? "");
  const [currentFeatures, setCurrentFeatures] = useState((profile?.current_features ?? []).join("\n"));
  const [pricingModel, setPricingModel] = useState(profile?.pricing_model ?? "");
  const [currentStage, setCurrentStage] = useState(profile?.current_stage ?? "");
  const [positioningNotes, setPositioningNotes] = useState(profile?.positioning_notes ?? "");
  const [knownConstraints, setKnownConstraints] = useState(profile?.known_constraints ?? "");
  const [doNotBuild, setDoNotBuild] = useState((profile?.do_not_build ?? []).join("\n"));

  if (!projectId) return null;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Product Profile</div>
          <p className="mt-1 text-sm text-muted-foreground">Product Review uses this as product context.</p>
        </div>
        <Button
          disabled={isSaving || !productName.trim()}
          onClick={() => onSave({
            project_id: projectId,
            product_name: productName,
            product_url: productUrl || null,
            short_description: shortDescription || null,
            target_users: targetUsers || null,
            core_value: coreValue || null,
            current_features: lines(currentFeatures),
            pricing_model: pricingModel || null,
            current_stage: currentStage || null,
            positioning_notes: positioningNotes || null,
            known_constraints: knownConstraints || null,
            do_not_build: lines(doNotBuild),
          })}
        >
          {isSaving ? "Saving..." : "Save profile"}
        </Button>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Product name" />
        <Input value={productUrl} onChange={(event) => setProductUrl(event.target.value)} placeholder="Product URL" />
        <Input value={targetUsers} onChange={(event) => setTargetUsers(event.target.value)} placeholder="Target users" />
        <Input value={coreValue} onChange={(event) => setCoreValue(event.target.value)} placeholder="Core value" />
        <Input value={pricingModel} onChange={(event) => setPricingModel(event.target.value)} placeholder="Pricing model" />
        <Input value={currentStage} onChange={(event) => setCurrentStage(event.target.value)} placeholder="Current stage" />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <textarea className="min-h-24 rounded-md border border-input bg-background p-3 text-sm" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} placeholder="Short description" />
        <textarea className="min-h-24 rounded-md border border-input bg-background p-3 text-sm" value={positioningNotes} onChange={(event) => setPositioningNotes(event.target.value)} placeholder="Positioning notes" />
        <textarea className="min-h-24 rounded-md border border-input bg-background p-3 text-sm" value={currentFeatures} onChange={(event) => setCurrentFeatures(event.target.value)} placeholder="Current features, one per line" />
        <textarea className="min-h-24 rounded-md border border-input bg-background p-3 text-sm" value={doNotBuild} onChange={(event) => setDoNotBuild(event.target.value)} placeholder="Do not build, one per line" />
      </div>
      <Input className="mt-3" value={knownConstraints} onChange={(event) => setKnownConstraints(event.target.value)} placeholder="Known constraints" />
    </Card>
  );
}

function ProductReviewPanel({
  review,
  clusters,
  isLoading,
}: {
  review?: ProductReviewRun;
  clusters: EvidenceCluster[];
  isLoading: boolean;
}) {
  if (isLoading) return <PageSkeleton />;
  if (!review) {
    return <EmptyState title="No product review" description="Run a low-frequency product review to create opportunity scores and backlog candidates." />;
  }
  const summary = review.summary ?? {};
  const scores = [
    ["Need", review.need_score],
    ["Pain", review.pain_score],
    ["Gap", review.gap_score],
    ["Product fit", review.product_fit_score],
    ["Message fit", review.message_fit_score],
    ["Acquisition fit", review.acquisition_fit_score],
    ["Evidence confidence", review.evidence_confidence],
    ["Cost risk", review.implementation_cost_risk],
  ] as const;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Product Opportunity Score</div>
            <p className="mt-1 text-sm text-muted-foreground">
              This is an improvement priority score from current evidence, not a demand, success, or revenue verdict.
            </p>
          </div>
          <div className="text-3xl font-semibold">{Math.round(review.product_opportunity_score ?? 0)}/100</div>
        </div>
        {(review.evidence_confidence ?? 0) < 50 ? (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            証拠数が少ないため、このレビューの信頼度は低めです。
          </div>
        ) : null}
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        {scores.map(([label, value]) => (
          <Card className="p-4" key={label}>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-2 text-xl font-semibold">{Math.round(value ?? 0)}</div>
            <Progress className="mt-3" value={Math.max(0, Math.min(100, value ?? 0))} />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <div className="font-semibold">Executive Summary</div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{String(summary.executive_summary ?? "No summary.")}</p>
        </Card>
        <Card className="p-4">
          <div className="font-semibold">Recommended positioning</div>
          <div className="mt-3 grid gap-2">
            {listOf(summary.recommended_positioning).map((item) => <div className="rounded-md border border-border p-3 text-sm" key={item}>{item}</div>)}
          </div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ResearchSection title="Strongest Pain Points" items={listOf(summary.strongest_pain_points)} badge="Evidence" />
        <ResearchSection title="Competitor Gaps" items={listOf(summary.competitor_gaps)} badge="Directional" />
        <ResearchSection title="Do Not Build" items={review.do_not_build ?? listOf(summary.do_not_build)} badge="Guardrail" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Cluster list</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {(review.clusters ?? clusters).slice(0, 8).map((cluster) => (
            <div className="rounded-md border border-border p-3 text-sm" key={cluster.id}>
              <div className="font-medium">{cluster.label}</div>
              <p className="mt-2 text-muted-foreground">{cluster.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ProductBacklogPanel({
  backlog,
  isLoading,
  isDeciding,
  isConverting,
  onDecision,
  onConvert,
}: {
  backlog: ProductBacklogItem[];
  isLoading: boolean;
  isDeciding: boolean;
  isConverting: boolean;
  onDecision: (itemId: string, status: string) => Promise<void>;
  onConvert: (itemId: string) => Promise<void>;
}) {
  if (isLoading) return <PageSkeleton />;
  if (!backlog.length) {
    return <EmptyState title="No product backlog" description="Run Product Review to save product-level improvement candidates." />;
  }
  return (
    <div className="space-y-4">
      <Card className="p-4 text-sm text-muted-foreground">
        Product Review results stay as backlog candidates. Codex task conversion requires a manual ready_for_codex decision.
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {backlog.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{item.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={item.priority === "critical" || item.priority === "high" ? "warning" : "secondary"}>{item.priority}</Badge>
                <Badge variant="outline">{item.status}</Badge>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
              <MetricDelta label="Impact" value={item.impact_score} />
              <MetricDelta label="Cost" value={item.cost_score} />
              <MetricDelta label="Confidence" value={item.confidence_score} />
              <MetricDelta label="Evidence" value={item.evidence_count} />
            </div>
            <div className="mt-3 text-sm">
              <div className="text-xs text-muted-foreground">Target area</div>
              <div>{item.target_area ?? item.category}</div>
            </div>
            {item.rationale ? <p className="mt-3 text-sm text-muted-foreground">{item.rationale}</p> : null}
            {item.risk_notes ? <p className="mt-2 text-sm text-muted-foreground">{item.risk_notes}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={isDeciding} onClick={() => onDecision(item.id, "approved")}>Approve</Button>
              <Button size="sm" variant="outline" disabled={isDeciding} onClick={() => onDecision(item.id, "rejected")}>Reject</Button>
              <Button size="sm" variant="outline" disabled={isDeciding} onClick={() => onDecision(item.id, "deferred")}>Defer</Button>
              <Button size="sm" disabled={isDeciding} onClick={() => onDecision(item.id, "ready_for_codex")}>Ready for Codex</Button>
              <Button size="sm" variant="outline" disabled={isConverting || item.status !== "ready_for_codex"} onClick={() => onConvert(item.id)}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Convert to Codex Task
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RoadmapPanel({
  roadmap,
  isLoading,
  isGenerating,
  onGenerate,
}: {
  roadmap?: ProductRoadmap;
  isLoading: boolean;
  isGenerating: boolean;
  onGenerate: () => Promise<void>;
}) {
  if (isLoading) return <PageSkeleton />;
  const sections = [
    ["Now", roadmap?.now_items ?? []],
    ["Next", roadmap?.next_items ?? []],
    ["Later", roadmap?.later_items ?? []],
    ["Do Not Build", roadmap?.do_not_build_items ?? []],
    ["Needs More Evidence", roadmap?.needs_more_evidence_items ?? []],
  ] as const;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">{roadmap?.title ?? "Product roadmap"}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {roadmap?.summary ?? "Generate a roadmap from backlog candidates. This is planning support, not automatic implementation."}
            </p>
          </div>
          <Button onClick={onGenerate} disabled={isGenerating}>
            <Map className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Regenerate roadmap"}
          </Button>
        </div>
      </Card>
      {roadmap ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {sections.map(([title, items]) => (
            <Card key={title}>
              <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
              <CardContent className="grid gap-2">
                {items.length ? items.map((item, index) => (
                  <div className="rounded-md border border-border p-3 text-sm" key={`${title}-${index}`}>
                    <div className="font-medium">{String(item.title ?? "Roadmap item")}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {String(item.priority ?? "priority unknown")} / confidence {String(item.confidence_score ?? "-")}
                    </div>
                  </div>
                )) : <div className="text-sm text-muted-foreground">No items.</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No roadmap" description="Generate a roadmap after Product Review creates backlog candidates." />
      )}
    </div>
  );
}

function MonitoringPanel({
  runs,
  alerts,
  query,
  monitoringType,
  isLoading,
  isRunning,
  isUpdating,
  onQueryChange,
  onMonitoringTypeChange,
  onRun,
  onUpdateAlert,
}: {
  runs: MonitoringRun[];
  alerts: IntelligenceAlert[];
  query: string;
  monitoringType: string;
  isLoading: boolean;
  isRunning: boolean;
  isUpdating: boolean;
  onQueryChange: (value: string) => void;
  onMonitoringTypeChange: (value: string) => void;
  onRun: () => Promise<void>;
  onUpdateAlert: (alertId: string, status: string) => Promise<void>;
}) {
  if (isLoading) return <PageSkeleton />;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
          <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Monitoring query" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={monitoringType} onChange={(event) => onMonitoringTypeChange(event.target.value)}>
            {["market", "competitor", "review", "search_intent", "pain_trend"].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <Button onClick={onRun} disabled={isRunning}>
            <Bell className="mr-2 h-4 w-4" />
            {isRunning ? "Monitoring..." : "Run monitoring"}
          </Button>
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Open Intelligence Alerts</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {alerts.length ? alerts.map((alert) => (
              <div className="rounded-md border border-border p-3 text-sm" key={alert.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{alert.title}</div>
                  <Badge variant={alert.severity === "high" ? "warning" : "secondary"}>{alert.severity}</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">{alert.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => onUpdateAlert(alert.id, "reviewed")}>Mark reviewed</Button>
                  <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => onUpdateAlert(alert.id, "closed")}>Close</Button>
                </div>
              </div>
            )) : <EmptyState title="No open alerts" description="Run monitoring to detect pain spikes, competitor shifts, and opportunity signals." />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Monitoring runs</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {runs.length ? runs.slice(0, 8).map((run) => (
              <div className="rounded-md border border-border p-3 text-sm" key={run.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{run.query ?? run.monitoring_type}</div>
                  <Badge variant="outline">{run.status}</Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {run.monitoring_type} / evidence {run.evidence_count} / alerts {run.alerts?.length ?? 0}
                </div>
              </div>
            )) : <div className="text-sm text-muted-foreground">No monitoring runs yet.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LearningPanel({
  patterns,
  isLoading,
  isRefreshing,
  onRefresh,
}: {
  patterns: LearningPattern[];
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
}) {
  if (isLoading) return <PageSkeleton />;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Learning Patterns</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Outcome results bias future recommendations. They are learning signals, not guarantees.
            </p>
          </div>
          <Button onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isRefreshing ? "Refreshing..." : "Refresh patterns"}
          </Button>
        </div>
      </Card>
      {patterns.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {patterns.map((pattern) => (
            <Card className="p-4" key={pattern.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">{pattern.title}</div>
                <Badge variant="outline">{pattern.pattern_type}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{pattern.description ?? "No description."}</p>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                <MetricDelta label="Positive" value={pattern.success_count} />
                <MetricDelta label="Negative" value={pattern.failure_count} />
                <MetricDelta label="Inconclusive" value={pattern.inconclusive_count} />
                <MetricDelta label="Bias" value={pattern.recommendation_bias} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No learning patterns" description="Refresh after measured outcomes exist." />
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

function listOf(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function lines(value: string): string[] {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
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
