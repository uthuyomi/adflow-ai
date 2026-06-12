"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCodexTasks } from "@/hooks/use-codex-tasks";

const statuses = ["", "CREATED", "QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED", "PR_CREATED", "OUTCOME_CREATED"];

export default function CodexTasksPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("");
  const [improvement, setImprovement] = useState("");
  const query = useMemo(() => new URLSearchParams(Object.fromEntries(Object.entries({ status, search, project_id: project, improvement_id: improvement }).filter(([, value]) => value))).toString(), [status, search, project, improvement]);
  const tasks = useCodexTasks(query);
  if (tasks.isLoading) return <PageSkeleton />;
  if (tasks.isError) return <ErrorState />;
  return <div className="space-y-6">
    <SectionHeader title="Codex Tasks" description="Track approved implementation tasks, execution results, pull requests, and outcomes." />
    <div className="grid gap-3 md:grid-cols-4">
      <Input onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" value={search} />
      <Input onChange={(event) => setProject(event.target.value)} placeholder="Project ID filter" value={project} />
      <Input onChange={(event) => setImprovement(event.target.value)} placeholder="Improvement ID filter" value={improvement} />
      <select className="rounded-md border bg-background px-3 text-sm" onChange={(event) => setStatus(event.target.value)} value={status}>{statuses.map((item) => <option key={item || "ALL"} value={item}>{item || "ALL STATUSES"}</option>)}</select>
    </div>
    <div className="flex flex-wrap gap-2">{statuses.slice(1).map((item) => <Badge key={item} variant={status === item ? "default" : "secondary"}>{item}: {(tasks.data?.items ?? []).filter((task) => task.status === item).length}</Badge>)}</div>
    {tasks.data?.items.length ? <div className="grid gap-4">{tasks.data.items.map((task) => <Link href={`/codex-tasks/${task.id}`} key={task.id}><Card className="p-5 transition-colors hover:bg-accent"><div className="flex items-start justify-between gap-4"><div><div className="font-semibold">{task.title}</div><p className="mt-1 text-sm text-muted-foreground">{task.result_summary || task.summary || task.implementation_goal}</p><p className="mt-2 text-xs text-muted-foreground">Improvement: {task.source_ai_result_id} / {new Date(task.created_at).toLocaleString()}</p></div><Badge>{task.status}</Badge></div></Card></Link>)}</div> : <EmptyState title="No Codex tasks" description="Create one from an Apply Ready improvement." />}
  </div>;
}
