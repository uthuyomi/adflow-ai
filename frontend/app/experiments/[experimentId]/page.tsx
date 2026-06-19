"use client";

import { useParams } from "next/navigation";
import { toast } from "sonner";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useExperiment, useExperimentActions } from "@/hooks/use-experiments";
import type { ExperimentStatus } from "@/lib/api/experiments";

const next: Partial<Record<ExperimentStatus, ExperimentStatus[]>> = { DRAFT: ["READY", "ARCHIVED"], READY: ["RUNNING", "FAILED", "ARCHIVED"], RUNNING: ["PAUSED", "COMPLETED", "FAILED"], PAUSED: ["RUNNING", "COMPLETED", "FAILED", "ARCHIVED"], FAILED: ["READY", "ARCHIVED"], COMPLETED: ["ARCHIVED"] };

export default function ExperimentDetailPage() {
  const id = String(useParams().experimentId);
  const experiment = useExperiment(id);
  const actions = useExperimentActions(id);
  if (experiment.isLoading) return <PageSkeleton />;
  if (experiment.isError || !experiment.data) return <ErrorState />;
  const row = experiment.data;
  const run = async (promise: Promise<unknown>, message: string) => { try { await promise; toast.success(message); } catch (error) { toast.error(error instanceof Error ? error.message : "Operation failed"); } };
  return <div className="space-y-6">
    <SectionHeader title={row.name} description={row.hypothesis || "Measured experiment"} />
    <Card className="p-4"><div className="flex flex-wrap items-center gap-2"><Badge>{row.status}</Badge>{(next[row.status] ?? []).map((status) => <Button key={status} onClick={() => run(actions.transition.mutateAsync({ status }), `Moved to ${status}`)} size="sm" variant="outline">{status}</Button>)}</div></Card>
    <div className="grid gap-4 lg:grid-cols-2">{row.variants.map((variant) => <Card className="p-4" key={variant.id}><div className="flex justify-between"><h2 className="font-semibold">{variant.name}</h2><Badge variant="secondary">{variant.allocation}%</Badge></div><p className="mt-3 text-sm text-muted-foreground">{variant.measurements.length} persisted measurement snapshots</p></Card>)}</div>
    <Card className="p-4"><h2 className="font-semibold">Measurement and evaluation</h2><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => run(actions.collect.mutateAsync(), "Measurements collected")} variant="outline">Collect real measurements</Button><Button onClick={() => run(actions.evaluate.mutateAsync(false), "Evaluation saved")}>Evaluate</Button><Button onClick={() => run(actions.evaluate.mutateAsync(true), "Evaluation saved and experiment completed")} variant="secondary">Evaluate and complete if winner</Button></div>{row.latest_evaluation ? <div className="mt-4 rounded border p-3 text-sm"><div className="font-medium">{row.latest_evaluation.status}</div><p className="text-muted-foreground">{row.latest_evaluation.reason}</p><div>Improvement: {(row.latest_evaluation.improvement_rate * 100).toFixed(2)}% / Confidence: {(row.latest_evaluation.confidence_score * 100).toFixed(2)}%</div></div> : null}</Card>
    <Card className="p-4"><h2 className="font-semibold">Audit history</h2><div className="mt-3 space-y-2">{row.history.map((item, index) => <div className="rounded border p-2 text-sm" key={index}>{String(item.old_status ?? "CREATED")} → {String(item.new_status)} / {String(item.reason ?? "")}</div>)}</div></Card>
  </div>;
}
