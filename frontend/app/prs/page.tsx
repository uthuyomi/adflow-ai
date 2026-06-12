"use client";

import { ExternalLink } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usePrs } from "@/hooks/usePrs";
import { useSyncGitHubPr } from "@/hooks/usePrs";
import { Button } from "@/components/ui/button";

export default function PrsPage() {
  const prs = usePrs();
  const sync = useSyncGitHubPr();
  if (prs.isLoading) return <PageSkeleton />;
  if (prs.isError) return <ErrorState />;
  const prItems = prs.data ?? [];
  return (
    <div className="space-y-6">
      <SectionHeader title="PR Reviews" description="Track pull requests created for human review and approval." />
      {sync.isError ? <p className="text-sm text-destructive">GitHub status sync failed. The saved PR state is still shown.</p> : null}
      {prItems.length ? (
        <div className="grid gap-4">
          {prItems.map((pr) => (
            <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between" key={pr.id}>
              <div>
                <div className="font-semibold">{pr.pr_title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{pr.repository} / {pr.branch_name} / {new Date(pr.created_at).toLocaleString()}</div>
                <div className="mt-1 text-xs text-muted-foreground">Improvement: {pr.improvement_id} / Commit: {pr.commit_sha?.slice(0, 8) ?? "pending"}</div>
                <div className="mt-1 text-xs text-muted-foreground">Last synced: {pr.last_synced_at ? new Date(pr.last_synced_at).toLocaleString() : "not synced"}</div>
                {pr.error_message ? <div className="mt-1 text-xs text-destructive">{pr.error_message}</div> : null}
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{pr.status}</Badge>
                <Button disabled={sync.isPending} size="sm" variant="outline" onClick={() => sync.mutate(pr.id)}>Sync</Button>
                {pr.pr_url ? <a className="inline-flex items-center gap-2 text-sm font-medium text-primary" href={pr.pr_url} target="_blank" rel="noreferrer">Open #{pr.pr_number} <ExternalLink className="h-4 w-4" /></a> : null}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No PRs" description="Approved improvements that create PRs will appear here." />
      )}
    </div>
  );
}
