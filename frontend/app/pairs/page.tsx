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

function AnalyzeButton({ pairId }: { pairId: string }) {
  const run = useRunPairAnalysis(pairId);
  const analyze = async () => {
    try {
      await run.mutateAsync();
      toast.success("Analysis completed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed.");
    }
  };
  return (
    <Button size="sm" variant="outline" onClick={analyze} disabled={run.isPending}>
      <Play className="mr-2 h-4 w-4" />
      {run.isPending ? "Running" : "Analyze"}
    </Button>
  );
}

export default function PairsPage() {
  const pairs = useAdLpPairs();
  const mutations = useAdLpPairMutations();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const remove = async () => {
    if (!deleteId) return;
    try {
      await mutations.remove.mutateAsync(deleteId);
      toast.success("Pair deleted.");
      setDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  if (pairs.isLoading) return <PageSkeleton />;
  if (pairs.isError) return <ErrorState />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Ad LP Pairs"
        description="Treat each ad and landing page pair as one analysis and review unit."
        action={
          <Button asChild>
            <Link href="/pairs/new">
              <Plus className="mr-2 h-4 w-4" />
              New pair
            </Link>
          </Button>
        }
      />
      {pairs.data?.length ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pair</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead>LP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last analyzed</TableHead>
                <TableHead className="w-64">Actions</TableHead>
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
                        <Link href={`/pairs/${pair.id}`} aria-label="Pair detail">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild size="icon" variant="ghost">
                        <Link href={`/pairs/${pair.id}/edit`} aria-label="Edit pair">
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(pair.id)} aria-label="Delete pair">
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
        <EmptyState title="No ad LP pairs" description="Create a pair after registering at least one ad and one landing page." />
      )}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete pair"
        description="The pair will be removed, but the delete history remains available."
        isPending={mutations.remove.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={remove}
      />
    </div>
  );
}
