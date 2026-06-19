"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Copy, Archive, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProjectMutations, useProjects } from "@/hooks/use-projects";
import { showActionableError } from "@/lib/api/errors";

export default function ProjectsPage() {
  const projects = useProjects();
  const mutations = useProjectMutations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const rows = useMemo(() => (projects.data ?? []).filter((item) =>
    (status === "ALL" || item.status === status) && `${item.name} ${item.description ?? ""}`.toLowerCase().includes(query.toLowerCase())
  ), [projects.data, query, status]);

  const create = async () => {
    try {
      await mutations.create.mutateAsync({ name, description });
      setName(""); setDescription(""); toast.success("Project created");
    } catch (error) { showActionableError(error, "Project creation failed"); }
  };
  const transition = async (id: string, next: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED") => {
    try { await mutations.update.mutateAsync({ id, payload: { status: next } }); toast.success(`Project moved to ${next}`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Project update failed"); }
  };
  if (projects.isLoading) return <PageSkeleton />;

  return <div className="space-y-6">
    <SectionHeader title="Projects" description="Create, search, pause, archive, restore, duplicate, and soft-delete operational workspaces." />
    <Card className="grid gap-3 p-4 md:grid-cols-[1fr_2fr_auto]">
      <Input placeholder="Project name" value={name} onChange={(event) => setName(event.target.value)} />
      <Textarea placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
      <Button onClick={create} disabled={!name || mutations.create.isPending}>Create</Button>
    </Card>
    <div className="flex flex-wrap gap-2">
      <Input className="max-w-sm" placeholder="Search projects" value={query} onChange={(event) => setQuery(event.target.value)} />
      {["ALL", "ACTIVE", "PAUSED", "ARCHIVED", "DELETED"].map((item) => <Button key={item} onClick={() => setStatus(item)} size="sm" variant={status === item ? "default" : "outline"}>{item}</Button>)}
    </div>
    {rows.length ? <div className="grid gap-4 md:grid-cols-2">{rows.map((project) =>
      <Card className="p-5" key={project.id}>
        <div className="flex items-start justify-between gap-3"><Link className="font-semibold hover:underline" href={`/projects/${project.id}`}>{project.name}</Link><Badge variant="secondary">{project.status}</Badge></div>
        <p className="mt-2 min-h-10 text-sm text-muted-foreground">{project.description || "No description"}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.status !== "ACTIVE" ? <Button size="sm" variant="outline" onClick={() => transition(project.id, "ACTIVE")}><Play className="mr-1 h-3.5 w-3.5" />Restore</Button> : <Button size="sm" variant="outline" onClick={() => transition(project.id, "PAUSED")}><Pause className="mr-1 h-3.5 w-3.5" />Pause</Button>}
          <Button size="sm" variant="outline" onClick={() => transition(project.id, "ARCHIVED")}><Archive className="mr-1 h-3.5 w-3.5" />Archive</Button>
          <Button size="sm" variant="outline" onClick={async () => {
            try {
              await mutations.duplicate.mutateAsync(project.id);
              toast.success("Project duplicated");
            } catch (error) {
              showActionableError(error, "Project duplication failed");
            }
          }}><Copy className="mr-1 h-3.5 w-3.5" />Duplicate</Button>
          <Button size="sm" variant="outline" onClick={() => transition(project.id, "DELETED")}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>
        </div>
      </Card>
    )}</div> : <EmptyState title="No matching projects" description="Change the search or status filter." />}
  </div>;
}
