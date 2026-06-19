"use client";

import Link from "next/link";
import { Eye, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdLpPairMutations, useAdLpPairs } from "@/hooks/use-ad-lp-pairs";
import { useRunPairAnalysis } from "@/hooks/use-analysis-runs";
import { useUiStore } from "@/lib/store";
import { useI18n } from "@/hooks/use-i18n";
import { showActionableError } from "@/lib/api/errors";

function AnalyzeButton({ pairId }: { pairId: string }) {
  const { t } = useI18n();
  const run = useRunPairAnalysis(pairId);
  const aiMode = useUiStore((state) => state.analysisAIMode);
  const analyze = async () => {
    try {
      await run.mutateAsync(aiMode);
      toast.success(t("pairs.analysisCompleted"));
    } catch (error) {
      showActionableError(error, t("pairs.analysisFailed"), t("pricing.choosePlan"));
    }
  };
  return (
    <Button size="sm" variant="outline" onClick={analyze} disabled={run.isPending}>
      <Play className="mr-2 h-4 w-4" />
      {run.isPending ? t("pairs.running") : t("pairs.analyze")}
    </Button>
  );
}

export default function PairsPage() {
  const { t } = useI18n();
  const pairs = useAdLpPairs();
  const mutations = useAdLpPairMutations();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const remove = async () => {
    if (!deleteId) return;
    try {
      await mutations.remove.mutateAsync(deleteId);
      toast.success(t("pairs.deleted"));
      setDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("pairs.deleteFailed"));
    }
  };

  if (pairs.isLoading) return <PageSkeleton />;
  if (pairs.isError) return <ErrorState />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t("pairs.title")}
        description={t("pairs.description")}
        action={
          <Button asChild>
            <Link href="/pairs/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("pairs.new")}
            </Link>
          </Button>
        }
      />
      {pairs.data?.length ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("pairs.pair")}</TableHead>
                <TableHead>{t("adOptimization.ad")}</TableHead>
                <TableHead>LP</TableHead>
                <TableHead>{t("form.status")}</TableHead>
                <TableHead>{t("pairs.lastAnalyzed")}</TableHead>
                <TableHead className="w-64">{t("ads.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pairs.data.map((pair) => (
                <TableRow key={pair.id}>
                  <TableCell className="font-medium">{pair.name}</TableCell>
                  <TableCell>{pair.twitter_ads?.name ?? pair.twitter_ad_id}</TableCell>
                  <TableCell>{pair.landing_pages?.name ?? pair.landing_page_id}</TableCell>
                  <TableCell>{pair.status}</TableCell>
                  <TableCell>{pair.last_analyzed_at ? new Date(pair.last_analyzed_at).toLocaleString() : "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <AnalyzeButton pairId={pair.id} />
                      <Button asChild size="icon" variant="ghost">
                        <Link href={`/pairs/${pair.id}`} aria-label={t("pairs.detail")}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild size="icon" variant="ghost">
                        <Link href={`/pairs/${pair.id}/edit`} aria-label={t("pairs.edit")}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(pair.id)} aria-label={t("pairs.delete")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <EmptyState title={t("pairs.emptyTitle")} description={t("pairs.emptyDescription")} />
      )}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title={t("pairs.delete")}
        description={t("pairs.deleteDescription")}
        isPending={mutations.remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={remove}
      />
    </div>
  );
}
