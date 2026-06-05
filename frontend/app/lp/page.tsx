"use client";

import { LpIssueList } from "@/components/lp/LpIssueList";
import { LpPerformanceCards } from "@/components/lp/LpPerformanceCards";
import { LpSummaryCard } from "@/components/lp/LpSummaryCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useLpAnalysis } from "@/hooks/useLpAnalysis";
import { useI18n } from "@/hooks/use-i18n";

export default function LpPage() {
  const { t } = useI18n();
  const lp = useLpAnalysis();
  if (lp.isLoading) return <PageSkeleton />;
  if (lp.isError) return <ErrorState />;
  if (!lp.data) return <EmptyState title={t("lp.emptyTitle")} description={t("lp.emptyDescription")} />;
  return (
    <div className="space-y-6">
      <SectionHeader title={t("lp.title")} description={t("lp.description")} />
      <LpPerformanceCards lp={lp.data} />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <LpSummaryCard lp={lp.data} />
        <LpIssueList lp={lp.data} />
      </div>
    </div>
  );
}
