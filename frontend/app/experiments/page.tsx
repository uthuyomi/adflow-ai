"use client";

import Link from "next/link";
import { useState } from "react";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useExperimentDashboard, useExperiments } from "@/hooks/use-experiments";

const statuses = ["", "DRAFT", "READY", "RUNNING", "PAUSED", "COMPLETED", "FAILED", "ARCHIVED"];

export default function ExperimentsPage() {
  const [status, setStatus] = useState("");
  const experiments = useExperiments({ status });
  const dashboard = useExperimentDashboard();
  if (experiments.isLoading || dashboard.isLoading) return <PageSkeleton />;
  if (experiments.isError || dashboard.isError) return <ErrorState />;
  const d = dashboard.data;
  return <div className="space-y-6">
    <SectionHeader title="Experiments" description="Run measured experiments, detect winners, and feed verified results into learning." />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Active experiments" value={d?.active_experiments ?? 0} />
      <Metric label="Success rate %" value={d?.success_rate ?? 0} />
      <Metric label="Revenue impact" value={d?.total_revenue_impact ?? 0} />
      <Metric label="Learning insights" value={d?.learning_insights ?? 0} />
    </div>
    <select className="rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setStatus(event.target.value)} value={status}>
      {statuses.map((item) => <option key={item || "all"} value={item}>{item || "All statuses"}</option>)}
    </select>
    {(experiments.data ?? []).length ? <div className="space-y-3">{experiments.data!.map((experiment) =>
      <Link href={`/experiments/${experiment.id}`} key={experiment.id}><Card className="mb-3 p-4 transition-colors hover:bg-accent">
        <div className="flex flex-wrap justify-between gap-3"><div><div className="font-semibold">{experiment.name}</div><p className="mt-1 text-sm text-muted-foreground">{experiment.hypothesis || "No hypothesis"}</p><div className="mt-2 text-xs text-muted-foreground">{experiment.primary_metric} / {experiment.variants.length} variants</div></div><Badge variant="secondary">{experiment.status}</Badge></div>
      </Card></Link>)}</div> : <EmptyState title="No experiments" description="Create an experiment from an ad optimization project." />}
    <Card className="p-4"><h2 className="font-semibold">Recent measured insights</h2><div className="mt-3 space-y-2">{(d?.recent_insights ?? []).map((item) => <div className="rounded border p-3" key={item.id}><div className="text-sm font-medium">{item.title}</div><p className="text-xs text-muted-foreground">{item.summary}</p></div>)}</div></Card>
  </div>;
}
function Metric({ label, value }: { label: string; value: number }) { return <Card className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></Card>; }
