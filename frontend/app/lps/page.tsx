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

export default function LpsPage() {
  const lps = useLandingPages();
  const mutations = useLandingPageMutations();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const remove = async () => {
    if (!deleteId) return;
    try {
      await mutations.remove.mutateAsync(deleteId);
      toast.success("LP deleted.");
      setDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  if (lps.isLoading) return <PageSkeleton />;
  if (lps.isError) return <ErrorState />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Landing Pages"
        description="Register LP copy, offer, audience, behavior metrics, and performance readings."
        action={
          <Button asChild>
            <Link href="/lps/new">
              <Plus className="mr-2 h-4 w-4" />
              New LP
            </Link>
          </Button>
        }
      />
      {lps.data?.length ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Hero</TableHead>
                <TableHead>Primary CTA</TableHead>
                <TableHead>Bounce</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead className="w-28">Actions</TableHead>
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
                        <Link href={`/lps/${lp.id}/edit`} aria-label="Edit LP">
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(lp.id)} aria-label="Delete LP">
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
        <EmptyState title="No landing pages" description="Register a landing page before creating ad-LP pairs." />
      )}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete LP"
        description="The LP will be removed, but the delete history remains available."
        isPending={mutations.remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={remove}
      />
    </div>
  );
}
