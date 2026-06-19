"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActivity } from "@/hooks/use-operations";
import { useProject, useProjectMutations } from "@/hooks/use-projects";

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const project = useProject(params.projectId);
  const activity = useActivity(params.projectId);
  const mutations = useProjectMutations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => { if (project.data) { setName(project.data.name); setDescription(project.data.description ?? ""); } }, [project.data]);
  if (project.isLoading) return <PageSkeleton />;
  if (project.isError || !project.data) return <ErrorState />;
  const save = async () => {
    try { await mutations.update.mutateAsync({ id: project.data.id, payload: { name, description } }); toast.success("Project updated"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Update failed"); }
  };
  return <div className="space-y-6">
    <SectionHeader title={project.data.name} description="Project settings and complete operational timeline." />
    <Card className="space-y-3 p-5">
      <div className="flex justify-between"><h2 className="font-semibold">Project settings</h2><Badge variant="secondary">{project.data.status}</Badge></div>
      <Input value={name} onChange={(event) => setName(event.target.value)} />
      <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      <Button onClick={save}>Save changes</Button>
    </Card>
    <Card className="p-5">
      <h2 className="font-semibold">Activity timeline</h2>
      <div className="mt-4 space-y-3">{activity.data?.length ? activity.data.map((item) => <div className="border-l-2 border-primary/30 pl-4" key={item.id}><div className="text-sm font-medium">{item.title}</div><div className="text-xs text-muted-foreground">{item.category} · {item.action} · {new Date(item.created_at).toLocaleString()}</div></div>) : <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}</div>
    </Card>
  </div>;
}
