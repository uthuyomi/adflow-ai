"use client";

import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProjectMutations, useProjects } from "@/hooks/use-projects";

export default function ProjectsPage() {
  const projects = useProjects();
  const mutations = useProjectMutations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const create = async () => {
    try {
      await mutations.create.mutateAsync({ name, description });
      setName("");
      setDescription("");
      toast.success("Project created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed.");
    }
  };

  if (projects.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <SectionHeader title="Projects" description="Group X ads, landing pages, pairs, history, and analysis runs by workspace." />
      <Card className="grid gap-3 p-4 md:grid-cols-[1fr_2fr_auto]">
        <Input placeholder="Project name" value={name} onChange={(event) => setName(event.target.value)} />
        <Textarea placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
        <Button onClick={create} disabled={!name || mutations.create.isPending}>
          Create
        </Button>
      </Card>
      {projects.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.data.map((project) => (
            <Card key={project.id} className="p-5">
              <div className="font-semibold">{project.name}</div>
              <p className="mt-2 text-sm text-muted-foreground">{project.description || "No description"}</p>
              <div className="mt-4 text-xs text-muted-foreground">{new Date(project.created_at).toLocaleString()}</div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No projects" description="Create a project before grouping ads and landing pages." />
      )}
    </div>
  );
}
