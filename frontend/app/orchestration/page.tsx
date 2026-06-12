"use client";

import { AlertTriangle, BrainCircuit, GitPullRequest, Route, ShieldCheck, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/hooks/use-i18n";
import { useAIAgentResults, useAIAgentScorecards, useAIAgents, useAIOrchestrationRuns } from "@/hooks/use-orchestration";

export default function OrchestrationPage() {
  const { t } = useI18n();
  const agents = useAIAgents();
  const runs = useAIOrchestrationRuns();
  const scorecards = useAIAgentScorecards();
  const latestRun = runs.data?.[0];
  const latestResults = useAIAgentResults(latestRun?.id);

  if (agents.isLoading || runs.isLoading || scorecards.isLoading || latestResults.isLoading) return <PageSkeleton />;
  if (agents.isError || runs.isError || scorecards.isError) return <ErrorState />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t("orchestration.title")}
        description={t("orchestration.description")}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <CommandMetric icon={<BrainCircuit className="h-5 w-5" />} label="Enabled agents" value={agents.data?.filter((agent) => agent.is_enabled).length ?? 0} />
        <CommandMetric icon={<Route className="h-5 w-5" />} label="Router runs" value={runs.data?.length ?? 0} />
        <CommandMetric icon={<Sparkles className="h-5 w-5" />} label="Scorecards" value={scorecards.data?.length ?? 0} />
        <CommandMetric icon={<ShieldCheck className="h-5 w-5" />} label="Review layer" value="Separated" />
      </div>

      <Card className="border-warning/40 bg-warning/10 p-4">
        <div className="flex gap-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
          <div>
            {t("orchestration.notice")}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="agents">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="agents">Specialized AI</TabsTrigger>
          <TabsTrigger value="router">Router Runs</TabsTrigger>
          <TabsTrigger value="scorecards">AI Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          {agents.data?.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {agents.data.map((agent) => (
                <Card key={agent.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base">{agent.display_name}</CardTitle>
                      <Badge variant={agent.is_enabled ? "secondary" : "outline"}>{agent.provider}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Role</div>
                      <div className="font-medium">{agent.role}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agent.strengths.map((strength) => (
                        <Badge key={strength} variant="outline">{strength}</Badge>
                      ))}
                    </div>
                    <div className="text-xs leading-5 text-muted-foreground">
                      Tasks: {agent.default_tasks.join(", ")}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No AI agents" description="Default specialized agents are created when this page loads." />
          )}
        </TabsContent>

        <TabsContent value="router">
          {runs.data?.length ? (
            <div className="space-y-4">
              {runs.data.map((run) => (
                <Card key={run.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{run.objective}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{run.route_reason}</div>
                    </div>
                    <Badge>{run.router_version}</Badge>
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-3">
                    {run.route_plan.map((step) => (
                      <div key={`${run.id}-${step.task}-${step.agent_key}`} className="rounded-md border border-border p-3 text-sm">
                        <div className="font-medium">{step.task}</div>
                        <div className="mt-1 text-muted-foreground">{step.provider} / {step.role}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No router runs" description="Run pair analysis to create AI orchestration logs." />
          )}
        </TabsContent>

        <TabsContent value="scorecards">
          {scorecards.data?.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {scorecards.data.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{item.agent_key}</div>
                    <Badge variant="outline">{item.metric}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{item.provider} on {item.platform}</div>
                  <div className="mt-4 text-2xl font-semibold">{Math.round(item.average_score)}%</div>
                  <Progress className="mt-3" value={Math.max(0, Math.min(100, item.average_score))} />
                  <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                    <div>Samples: {item.sample_count}</div>
                    <div>Accepted: {item.accepted_count} / Rejected: {item.rejected_count} / Apply-ready: {item.apply_ready_count}</div>
                    <div>Confidence: {Math.round((item.avg_confidence ?? 0) * 100)}%</div>
                    <div>Router score: {item.router_score}</div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No AI comparison data" description="Scorecards update as specialized agents produce pair-analysis results." />
          )}
        </TabsContent>
      </Tabs>

      {latestRun ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitPullRequest className="h-4 w-4" />
              Improvement Loop Position
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-6">
            {["Register", "Analyze", "Route", "Review", "Diff", "Measure"].map((step) => (
              <div key={step} className="rounded-md border border-border p-3 text-center font-medium">
                {step}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {latestResults.data?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent AI Proposals</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {latestResults.data.slice(0, 6).map((result) => {
              const output = result.output as { summary?: string };
              return (
                <div key={result.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{result.agent_key}</div>
                    <div className="flex gap-2">
                      <Badge variant={result.provider_type === "REAL" ? "secondary" : "warning"}>
                        {result.provider_type === "REAL" ? "実AI結果" : "モック結果"}
                      </Badge>
                      <Badge variant="outline">{result.decision_status}</Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-muted-foreground">{output.summary ?? result.task}</p>
                  {result.failure_reason ? <p className="mt-2 text-xs text-warning">{result.failure_reason}</p> : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function CommandMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
          {icon}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-lg font-semibold">{value}</div>
        </div>
      </div>
    </Card>
  );
}
