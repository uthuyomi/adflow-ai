"use client";

import { useParams } from "next/navigation";

import { ImprovementDetail } from "@/components/improvements/ImprovementDetail";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useImprovement } from "@/hooks/useImprovement";

export default function ImprovementDetailPage() {
  const params = useParams<{ improvementId: string }>();
  const improvement = useImprovement(params.improvementId);
  if (improvement.isLoading) return <PageSkeleton />;
  if (improvement.isError || !improvement.data) return <ErrorState />;
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Diff review"
        description="Compare proposed changes, inspect risk warnings, and manually approve PR creation."
      />
      <ImprovementDetail improvement={improvement.data} />
    </div>
  );
}
