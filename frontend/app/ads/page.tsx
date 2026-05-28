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
import { formatCurrency } from "@/lib/utils";

export default function AdsPage() {
  const ads = useTwitterAds();
  const mutations = useTwitterAdMutations();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const remove = async () => {
    if (!deleteId) return;
    try {
      await mutations.remove.mutateAsync(deleteId);
      toast.success("Ad deleted.");
      setDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  if (ads.isLoading) return <PageSkeleton />;
  if (ads.isError) return <ErrorState />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="X Ads"
        description="Register Twitter/X ads manually and keep every create, update, and delete in history."
        action={
          <Button asChild>
            <Link href="/ads/new">
              <Plus className="mr-2 h-4 w-4" />
              New ad
            </Link>
          </Button>
        }
      />
      {ads.data?.length ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Headline</TableHead>
                <TableHead>CTA</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead>CVR</TableHead>
                <TableHead>Spend</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
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
                        <Link href={`/ads/${ad.id}/edit`} aria-label="Edit ad">
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(ad.id)} aria-label="Delete ad">
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
        <EmptyState title="No X ads" description="Register an ad manually to start pair-based analysis." />
      )}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete ad"
        description="The ad will be removed, but the delete history remains available."
        isPending={mutations.remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={remove}
      />
    </div>
  );
}
