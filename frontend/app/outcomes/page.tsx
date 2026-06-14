"use client";

import Link from "next/link";
import { useState } from "react";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOutcomes, useOutcomeStats } from "@/hooks/use-outcomes";
import { useProjects } from "@/hooks/use-projects";
import type { ImprovementOutcomeStatus } from "@/lib/types/adflow";

const statuses: Array<ImprovementOutcomeStatus | ""> = ["", "DRAFT", "PENDING_MEASUREMENT", "MEASURING", "SUCCESS", "PARTIAL_SUCCESS", "NO_IMPACT", "FAILED", "ARCHIVED"];

export default function OutcomesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ImprovementOutcomeStatus | "">("");
  const [project, setProject] = useState("");
  const [sort, setSort] = useState("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const projects = useProjects();
  const outcomes = useOutcomes({ search, status, project_id: project, sort, date_from: dateFrom, date_to: dateTo ? `${dateTo}T23:59:59Z` : "" });
  const stats = useOutcomeStats();
  if (outcomes.isLoading || stats.isLoading || projects.isLoading) return <PageSkeleton />;
  if (outcomes.isError || stats.isError || projects.isError) return <ErrorState />;
  return <div className="space-y-6">
    <SectionHeader title="Outcomes" description="Measure implemented improvements, evaluate impact, and feed trustworthy results into future recommendations." />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <Metric label="Total" value={stats.data?.total ?? 0} /><Metric label="Success %" value={stats.data?.success_rate ?? 0} />
      <Metric label="Failure %" value={stats.data?.failure_rate ?? 0} /><Metric label="Avg improvement %" value={percent(stats.data?.average_improvement_rate)} />
      <Metric label="Avg CTR %" value={percent(stats.data?.average_ctr_improvement)} /><Metric label="Learning records" value={stats.data?.learning.learning_count ?? 0} />
    </div>
    <Card className="grid gap-3 p-4 md:grid-cols-3 lg:grid-cols-6">
      <Input onChange={(event) => setSearch(event.target.value)} placeholder="Search outcomes" value={search} />
      <select className="rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setStatus(event.target.value as ImprovementOutcomeStatus | "")} value={status}>{statuses.map((item) => <option key={item || "all"} value={item}>{item || "All statuses"}</option>)}</select>
      <select className="rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setProject(event.target.value)} value={project}><option value="">All projects</option>{(projects.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select className="rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setSort(event.target.value)} value={sort}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="outcome">Best outcome</option><option value="improvement_rate">Best improvement</option></select>
      <Input onChange={(event) => setDateFrom(event.target.value)} type="date" value={dateFrom} />
      <Input onChange={(event) => setDateTo(event.target.value)} type="date" value={dateTo} />
    </Card>
    {(outcomes.data ?? []).length ? <div className="space-y-3">{outcomes.data!.map((outcome) => <Link href={`/outcomes/${outcome.id}`} key={outcome.id}><Card className="mb-3 p-4 transition-colors hover:bg-accent"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold">{outcome.title}</div><p className="mt-1 text-sm text-muted-foreground">{outcome.outcome_summary || outcome.summary || outcome.description || "No summary"}</p><div className="mt-2 text-xs text-muted-foreground">Source: {outcome.measurement_source} / Improvement: {percent(outcome.improvement_rate)}%</div></div><Badge variant={outcome.outcome_status === "FAILED" ? "warning" : "secondary"}>{outcome.outcome_status}</Badge></div></Card></Link>)}</div> : <EmptyState title="No outcomes" description="Create an outcome from an improvement, Codex task, GitHub PR, or pair page." />}
    <div className="grid gap-4 lg:grid-cols-2">
      <CategoryStats title="Market success rates" rows={stats.data?.learning.by_market ?? []} />
      <CategoryStats title="Improvement-type success rates" rows={stats.data?.learning.by_improvement ?? []} />
    </div>
  </div>;
}

function Metric({ label, value }: { label: string; value: number | string }) { return <Card className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></Card>; }
function percent(value: number | null | undefined) { return ((value ?? 0) * 100).toFixed(2); }
function CategoryStats({ title, rows }: { title: string; rows: Array<Record<string, unknown>> }) { return <Card className="p-4"><h2 className="font-semibold">{title}</h2><div className="mt-3 space-y-2">{rows.slice(0, 8).map((row, index) => <div className="flex justify-between rounded border p-2 text-sm" key={`${String(row.category)}-${index}`}><span>{String(row.category)}</span><span>{String(row.success_rate ?? 0)}% / {String(row.learning_count ?? 0)} records</span></div>)}{!rows.length ? <div className="text-sm text-muted-foreground">No learning data</div> : null}</div></Card>; }
