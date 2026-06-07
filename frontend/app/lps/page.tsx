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
import { useLandingPageMutations, useLandingPages } from "@/hooks/use-landing-pages";
import { useI18n } from "@/hooks/use-i18n";

export default function LpsPage() {
  const { t } = useI18n();
  const lps = useLandingPages();
  const mutations = useLandingPageMutations();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const remove = async () => {
    if (!deleteId) return;
    try {
      await mutations.remove.mutateAsync(deleteId);
      toast.success(t("lps.deleted"));
      setDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("lps.deleteFailed"));
    }
  };

  if (lps.isLoading) return <PageSkeleton />;
  if (lps.isError) return <ErrorState />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t("lps.title")}
        description={t("lps.description")}
        action={
          <Button asChild>
            <Link href="/lps/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("lps.new")}
            </Link>
          </Button>
        }
      />
      {lps.data?.length ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("form.name")}</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>{t("lps.hero")}</TableHead>
                <TableHead>{t("form.primaryCta")}</TableHead>
                <TableHead>{t("lps.bounce")}</TableHead>
                <TableHead>{t("lps.speed")}</TableHead>
                <TableHead className="w-28">{t("ads.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lps.data.map((lp) => (
                <TableRow key={lp.id}>
                  <TableCell className="font-medium">{lp.name}</TableCell>
                  <TableCell className="max-w-56 truncate">{lp.url}</TableCell>
                  <TableCell>{lp.hero_title || "-"}</TableCell>
                  <TableCell>{lp.primary_cta || "-"}</TableCell>
                  <TableCell>{lp.bounce_rate ?? "-"}%</TableCell>
                  <TableCell>{lp.page_speed ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button asChild size="icon" variant="ghost">
                        <Link href={`/lps/${lp.id}/edit`} aria-label={t("lps.edit")}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(lp.id)} aria-label={t("lps.delete")}>
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
        <EmptyState title={t("lps.emptyTitle")} description={t("lps.emptyDescription")} />
      )}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title={t("lps.delete")}
        description={t("lps.deleteDescription")}
        isPending={mutations.remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={remove}
      />
    </div>
  );
}
