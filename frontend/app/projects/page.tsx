"use client";

import Link from "next/link";
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
import { useI18n } from "@/hooks/use-i18n";

export default function ProjectsPage() {
  const { t } = useI18n();
  const projects = useProjects();
  const mutations = useProjectMutations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const create = async () => {
    try {
      await mutations.create.mutateAsync({ name, description });
      setName("");
      setDescription("");
      toast.success(t("projects.created"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("projects.createFailed"));
    }
  };

  if (projects.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <SectionHeader title={t("projects.title")} description={t("projects.description")} />
      <Card className="grid gap-3 p-4 md:grid-cols-[1fr_2fr_auto]">
        <Input placeholder={t("projects.namePlaceholder")} value={name} onChange={(event) => setName(event.target.value)} />
        <Textarea placeholder={t("projects.descriptionPlaceholder")} value={description} onChange={(event) => setDescription(event.target.value)} />
        <Button onClick={create} disabled={!name || mutations.create.isPending}>
          {mutations.create.isPending ? t("common.saving") : t("projects.create")}
        </Button>
      </Card>
      {projects.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.data.map((project) => (
            <Link href={`/ad-optimization/${project.id}`} key={project.id}>
              <Card className="h-full p-5 transition-colors hover:bg-accent">
                <div className="font-semibold">{project.name}</div>
                <p className="mt-2 text-sm text-muted-foreground">{project.description || t("adOptimization.noDescription")}</p>
                <div className="mt-4 text-xs text-muted-foreground">{new Date(project.created_at).toLocaleString()}</div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title={t("projects.emptyTitle")} description={t("projects.emptyDescription")} />
      )}
    </div>
  );
}
