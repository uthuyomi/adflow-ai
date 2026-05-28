"use client";

import { LpIssueList } from "@/components/lp/LpIssueList";
import { LpPerformanceCards } from "@/components/lp/LpPerformanceCards";
import { LpSummaryCard } from "@/components/lp/LpSummaryCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useLpAnalysis } from "@/hooks/useLpAnalysis";

export default function LpPage() {
  const lp = useLpAnalysis();
  if (lp.isLoading) return <PageSkeleton />;
  if (lp.isError || !lp.data) return <ErrorState />;
  return (
    <div className="space-y-6">
      <SectionHeader title="LP Analysis" description="Inspect hero, CTA, FAQ, behavior, and performance issues." />
      <LpPerformanceCards lp={lp.data} />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <LpSummaryCard lp={lp.data} />
        <LpIssueList />
      </div>
    </div>
  );
}
