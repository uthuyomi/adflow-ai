"use client";

import { ExternalLink } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usePrs } from "@/hooks/usePrs";

export default function PrsPage() {
  const prs = usePrs();
  if (prs.isLoading) return <PageSkeleton />;
  if (prs.isError) return <ErrorState />;
  const prItems = prs.data ?? [];
  return (
    <div className="space-y-6">
      <SectionHeader title="PR Reviews" description="Track pull requests created for human review and approval." />
      {prItems.length ? (
        <div className="grid gap-4">
          {prItems.map((pr) => (
            <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between" key={pr.id}>
              <div>
                <div className="font-semibold">{pr.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{pr.relatedCampaign} / {pr.createdAt}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{pr.status}</Badge>
                <a className="inline-flex items-center gap-2 text-sm font-medium text-primary" href={pr.url} target="_blank" rel="noreferrer">Open <ExternalLink className="h-4 w-4" /></a>
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
