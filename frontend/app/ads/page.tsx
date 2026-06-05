"use client";

import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { useTwitterAdMutations, useTwitterAds } from "@/hooks/use-twitter-ads";
import { useI18n } from "@/hooks/use-i18n";
import { formatCurrency } from "@/lib/utils";

export default function AdsPage() {
  const { locale, t } = useI18n();
  const ads = useTwitterAds();
  const mutations = useTwitterAdMutations();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const remove = async () => {
    if (!deleteId) return;
    try {
      await mutations.remove.mutateAsync(deleteId);
      toast.success(t("ads.deleted"));
      setDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("ads.deleteFailed"));
    }
  };

  if (ads.isLoading) return <PageSkeleton />;
  if (ads.isError) return <ErrorState />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t("ads.title")}
        description={t("ads.description")}
        action={
          <Button asChild>
            <Link href="/ads/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("ads.new")}
            </Link>
          </Button>
        }
      />
      {ads.data?.length ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("ads.table.name")}</TableHead>
                <TableHead>{t("ads.table.headline")}</TableHead>
                <TableHead>CTA</TableHead>
                <TableHead>{t("ads.table.destination")}</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead>CVR</TableHead>
                <TableHead>{t("ads.table.spend")}</TableHead>
                <TableHead>{t("ads.table.status")}</TableHead>
                <TableHead className="w-28">{t("ads.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.data.map((ad) => (
                <TableRow key={ad.id}>
                  <TableCell className="font-medium">{ad.name}</TableCell>
                  <TableCell>{ad.headline || "-"}</TableCell>
                  <TableCell>{ad.cta || "-"}</TableCell>
                  <TableCell className="max-w-56 truncate">{ad.destination_url}</TableCell>
                  <TableCell>{ad.ctr}%</TableCell>
                  <TableCell>{ad.cvr}%</TableCell>
                  <TableCell>{formatCurrency(ad.spend)}</TableCell>
                  <TableCell>{ad.status}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button asChild size="icon" variant="ghost">
                        <Link href={`/ads/${ad.id}/edit`} aria-label={t("ads.edit")}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(ad.id)} aria-label={t("ads.delete")}>
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
        <EmptyState title={t("ads.emptyTitle")} description={t("ads.emptyDescription")} />
      )}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title={t("ads.delete")}
        description={t("ads.deleteDescription")}
        isPending={mutations.remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={remove}
      />
    </div>
  );
}
