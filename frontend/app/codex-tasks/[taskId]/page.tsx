"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { useCodexActions, useCodexConfiguration, useCodexTask } from "@/hooks/use-codex-tasks";
import { listGitHubConnections, listGitHubRepositories, selectGitHubRepository } from "@/lib/api/prs";
import { useQuery } from "@tanstack/react-query";

export default function CodexTaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const detail = useCodexTask(taskId);
  const actions = useCodexActions(taskId);
  const configuration = useCodexConfiguration();
  const [summary, setSummary] = useState("");
  const [files, setFiles] = useState('[{"path":"docs/codex-result.md","content":"Manual Codex execution result"}]');
  const [repository, setRepository] = useState("");
  const connections = useQuery({ queryKey: ["github-connections"], queryFn: listGitHubConnections });
  const connection = connections.data?.find((item) => item.status === "active");
  const repositories = useQuery({ queryKey: ["github-repositories", connection?.id], queryFn: () => listGitHubRepositories(connection!.id), enabled: Boolean(connection) });
  if (detail.isLoading) return <PageSkeleton />;
  if (detail.isError || !detail.data) return <ErrorState />;
  const { task, executions, history, pull_requests: prs, outcomes } = detail.data;
  const latestExecution = executions[0];
  const run = async (fn: () => Promise<unknown>, message: string) => { try { await fn(); toast.success(message); } catch (error) { toast.error(error instanceof Error ? error.message : "Operation failed."); } };
  return <div className="space-y-6">
    <SectionHeader title={task.title} description={`Codex task ${task.id}`} action={<Badge>{task.status}</Badge>} />
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-5"><h2 className="font-semibold">Approved prompt</h2><pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{JSON.stringify(task.prompt, null, 2)}</pre><p className="text-sm text-muted-foreground">Mode: {task.execution_mode || "not executed"} / Last run: {task.last_run_at ? new Date(task.last_run_at).toLocaleString() : "-"}</p></Card>
      <Card className="space-y-3 p-5"><h2 className="font-semibold">Execution</h2><p className="text-xs text-muted-foreground">Manual execution: enabled / Real execution: {configuration.data?.real_execution_enabled ? "enabled" : "not configured"} / Mock: disabled</p><Textarea onChange={(event) => setSummary(event.target.value)} placeholder="Manual execution summary" value={summary} /><Textarea onChange={(event) => setFiles(event.target.value)} value={files} /><div className="flex flex-wrap gap-2"><Button disabled={!["CREATED", "FAILED"].includes(task.status) || !summary || actions.manual.isPending} onClick={() => run(() => actions.manual.mutateAsync({ idempotency_key: `manual-${task.id}-${crypto.randomUUID()}`, summary, files_changed: JSON.parse(files), diff_summary: "Manual execution files", succeeded: true }), "Manual execution saved.")}>Register Manual Execution</Button><Button disabled={!configuration.data?.real_execution_enabled || !["CREATED", "FAILED"].includes(task.status) || actions.real.isPending} variant="outline" onClick={() => run(() => actions.real.mutateAsync(), "Real Codex execution completed.")}>Run Real Codex</Button><Button className="text-destructive" disabled={!["CREATED", "QUEUED", "RUNNING"].includes(task.status)} variant="outline" onClick={() => run(() => actions.cancel.mutateAsync(), "Task cancelled.")}>Cancel</Button></div>{latestExecution ? <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{latestExecution.stdout || latestExecution.stderr || latestExecution.summary}</pre> : null}</Card>
      <Card className="space-y-3 p-5"><h2 className="font-semibold">GitHub PR / Outcome</h2><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={repository} onChange={(event) => setRepository(event.target.value)}><option value="">Select repository</option>{(repositories.data ?? []).filter((item) => item.permissions.push).map((item) => <option key={item.id} value={item.full_name}>{item.full_name}</option>)}</select><div className="flex gap-2"><Button disabled={task.status !== "SUCCEEDED" || !latestExecution || !repository || !connection} onClick={() => run(async () => { const selection = await selectGitHubRepository(connection!.id, repository); await actions.pr.mutateAsync({ executionId: latestExecution!.id, selectionId: selection.id }); }, "Pull request created.")}>Create PR</Button><Button disabled={!["SUCCEEDED", "PR_CREATED"].includes(task.status)} variant="outline" onClick={() => run(() => actions.outcome.mutateAsync(), "Outcome created.")}>Create Outcome</Button></div>{prs.map((pr) => pr.pr_url ? <Link className="block text-sm text-primary" href={pr.pr_url} key={pr.id} target="_blank">PR #{pr.pr_number} / {pr.status}</Link> : null)}{outcomes.map((outcome) => <Link className="block text-sm text-primary" href={`/pairs/${outcome.ad_lp_pair_id}`} key={outcome.id}>Outcome: {outcome.title}</Link>)}</Card>
      <Card className="space-y-3 p-5"><h2 className="font-semibold">Status history</h2>{history.map((item) => <div className="border-b pb-2 text-sm" key={item.id}><div>{item.old_status || "NONE"} → {item.new_status}</div><div className="text-xs text-muted-foreground">{item.reason} / {new Date(item.changed_at).toLocaleString()}</div></div>)}</Card>
    </div>
  </div>;
}
