"use client";

import { useParams } from "next/navigation";

import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Card } from "@/components/ui/card";
import { useProject } from "@/hooks/use-projects";

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const project = useProject(params.projectId);
  if (project.isLoading) return <PageSkeleton />;
  if (project.isError || !project.data) return <ErrorState />;
  return (
    <div className="space-y-6">
      <SectionHeader title={project.data.name} description={project.data.description ?? "Project detail"} />
      <Card className="p-5 text-sm text-muted-foreground">
        Registered ads, LPs, pairs, history, and analysis runs can be filtered by this project as the workspace grows.
      </Card>
    </div>
  );
}
