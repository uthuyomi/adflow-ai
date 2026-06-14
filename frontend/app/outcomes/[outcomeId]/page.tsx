"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useOutcome, useOutcomeActions } from "@/hooks/use-outcomes";
import type { JsonRecord } from "@/lib/types/adflow";

export default function OutcomeDetailPage() {
  const { outcomeId } = useParams<{ outcomeId: string }>();
  const detail = useOutcome(outcomeId);
  const actions = useOutcomeActions(outcomeId);
  const [before, setBefore] = useState('{"ctr": 0.02, "cvr": 0.03}');
  const [after, setAfter] = useState('{"ctr": 0.024, "cvr": 0.033}');
  const [method, setMethod] = useState("Manual measurement");
  if (detail.isLoading) return <PageSkeleton />;
  if (detail.isError || !detail.data) return <ErrorState />;
  const { outcome, improvement, codex_task: task, github_pr: pr, project, history, learning } = detail.data;
  const run = async (action: () => Promise<unknown>, message: string) => { try { await action(); toast.success(message); } catch (error) { toast.error(error instanceof Error ? error.message : "Action failed."); } };
  return <div className="space-y-6">
    <SectionHeader title={outcome.title} description={outcome.summary || outcome.description || "Outcome measurement and learning detail"} />
    <div className="flex flex-wrap gap-2"><Badge>{outcome.outcome_status}</Badge><Badge variant="outline">{outcome.measurement_source}</Badge><Badge variant="outline">Improvement {((outcome.improvement_rate ?? 0) * 100).toFixed(2)}%</Badge></div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-5"><h2 className="font-semibold">Sources</h2><div className="text-sm">Project: {project?.name ?? "-"}</div><div className="text-sm">Improvement: {improvement?.id ?? "-"}</div><div className="text-sm">Codex Task: {task ? <Link className="text-primary" href={`/codex-tasks/${task.id}`}>{task.id}</Link> : "-"}</div><div className="text-sm">GitHub PR: {pr?.pr_url ? <Link className="text-primary" href={pr.pr_url} target="_blank">#{pr.pr_number} / {pr.status}</Link> : "-"}</div></Card>
      <Card className="space-y-3 p-5"><h2 className="font-semibold">Evaluation</h2><pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs">{JSON.stringify(outcome.evaluation_result, null, 2)}</pre><p className="text-sm text-muted-foreground">{outcome.outcome_summary}</p></Card>
    </div>
    <Card className="space-y-3 p-5"><h2 className="font-semibold">Record measurement</h2><div className="grid gap-3 md:grid-cols-2"><Textarea onChange={(event) => setBefore(event.target.value)} value={before} /><Textarea onChange={(event) => setAfter(event.target.value)} value={after} /></div><Input onChange={(event) => setMethod(event.target.value)} value={method} /><div className="flex flex-wrap gap-2"><Button disabled={actions.measure.isPending || outcome.outcome_status === "ARCHIVED"} onClick={() => run(() => actions.measure.mutateAsync({ before_metrics: parse(before), after_metrics: parse(after), measurement_method: method, measurement_source: "MANUAL", evidence_data: [{ recorded_from: "outcome_detail_ui" }] }), "Outcome measured and learning saved.")}>Measure and evaluate</Button><Button disabled={actions.refresh.isPending || outcome.outcome_status === "ARCHIVED"} variant="outline" onClick={() => run(() => actions.refresh.mutateAsync("X_ADS"), "X Ads measurement refreshed.")}>Refresh from X Ads</Button><Button disabled={outcome.outcome_status === "ARCHIVED"} variant="outline" onClick={() => run(() => actions.transition.mutateAsync({ status: "ARCHIVED", reason: "Archived by user." }), "Outcome archived.")}>Archive</Button></div></Card>
    <div className="grid gap-4 lg:grid-cols-2"><Card className="p-5"><h2 className="font-semibold">Before / After / Delta</h2><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs">{JSON.stringify({ before: outcome.before_metrics, after: outcome.after_metrics, delta: outcome.metric_delta }, null, 2)}</pre></Card><Card className="p-5"><h2 className="font-semibold">Learning</h2><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs">{JSON.stringify(learning, null, 2)}</pre></Card></div>
    <Card className="p-5"><h2 className="font-semibold">Audit history</h2><div className="mt-3 space-y-2">{history.map((item) => <div className="rounded border p-3 text-sm" key={item.id}>{item.old_status ?? "NEW"} → {item.new_status}<div className="text-xs text-muted-foreground">{item.reason} / {new Date(item.changed_at).toLocaleString()}</div></div>)}</div></Card>
  </div>;
}

function parse(value: string): JsonRecord { const parsed = JSON.parse(value) as unknown; if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Metrics must be a JSON object."); return parsed as JsonRecord; }
