"use client";

import { useState } from "react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useActivity, useJobs, useOperationsMutations, useSavedViews } from "@/hooks/use-operations";

export default function OperationsPage() {
  const jobs = useJobs();
  const activity = useActivity();
  const views = useSavedViews();
  const mutations = useOperationsMutations();
  const [viewName, setViewName] = useState("");
  return <div className="space-y-6">
    <SectionHeader title="Operations" description="Background jobs, cross-product audit activity, and reusable saved views." />
    <Card className="p-5"><h2 className="font-semibold">Saved views</h2><div className="mt-3 flex gap-2"><Input placeholder="View name" value={viewName} onChange={(event) => setViewName(event.target.value)} /><Button onClick={() => void mutations.createSavedView.mutateAsync({ name: viewName, view_type: "global_search", filters: {}, search_query: "", is_favorite: true, is_shared: false }).then(() => setViewName(""))} disabled={!viewName}>Save current view</Button></div><div className="mt-3 flex flex-wrap gap-2">{views.data?.map((view) => <Button key={view.id} onClick={() => void mutations.deleteSavedView.mutateAsync(view.id)} size="sm" variant="secondary">{view.name} ×</Button>)}</div></Card>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5"><h2 className="font-semibold">Background jobs</h2><div className="mt-4 space-y-3">{jobs.data?.length ? jobs.data.map((job) => <div className="rounded-md border p-3" key={job.id}><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{job.job_type}</span><Badge variant="secondary">{job.status}</Badge></div>{job.error_message ? <p className="mt-2 text-xs text-destructive">{job.error_message}</p> : null}{job.status === "FAILED" ? <Button className="mt-2" size="sm" variant="outline" onClick={() => void mutations.retryJob.mutateAsync(job.id).then(() => toast.success("Job queued for retry")).catch((error) => toast.error(error.message))}>Retry</Button> : null}</div>) : <p className="text-sm text-muted-foreground">No tracked jobs.</p>}</div></Card>
      <Card className="p-5"><h2 className="font-semibold">Unified audit timeline</h2><div className="mt-4 space-y-3">{activity.data?.length ? activity.data.map((item) => <div className="border-l-2 border-primary/30 pl-3" key={item.id}><div className="text-sm font-medium">{item.title}</div><div className="text-xs text-muted-foreground">{item.category} · {item.action} · {new Date(item.created_at).toLocaleString()}</div></div>) : <p className="text-sm text-muted-foreground">No activity recorded.</p>}</div></Card>
    </div>
  </div>;
}
