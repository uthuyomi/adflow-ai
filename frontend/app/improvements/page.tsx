"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ImprovementList } from "@/components/improvements/ImprovementList";
import { useImprovements } from "@/hooks/useImprovement";

export default function ImprovementsPage() {
  const improvements = useImprovements();
  if (improvements.isLoading) return <PageSkeleton />;
  if (improvements.isError) return <ErrorState />;
  const improvementItems = improvements.data ?? [];
  return (
    <div className="space-y-6">
      <SectionHeader title="Improvements" description="Review AI recommendations before approving any PR creation." />
      {improvementItems.length ? (
        <ImprovementList improvements={improvementItems} />
      ) : (
        <EmptyState title="No improvements" description="Run analysis to generate reviewable improvement proposals." />
      )}
    </div>
  );
}
