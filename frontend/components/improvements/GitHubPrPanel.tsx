"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateGitHubPr } from "@/hooks/usePrs";
import { listGitHubConnections, listGitHubRepositories, selectGitHubRepository } from "@/lib/api/prs";

export function GitHubPrPanel({ improvementId, enabled }: { improvementId: string; enabled: boolean }) {
  const connections = useQuery({ queryKey: ["github-connections"], queryFn: listGitHubConnections });
  const connection = connections.data?.find((item) => item.status === "active" && item.auth_type === "GITHUB_APP");
  const repositories = useQuery({ queryKey: ["github-repositories", connection?.id], queryFn: () => listGitHubRepositories(connection!.id), enabled: Boolean(connection) });
  const [repository, setRepository] = useState("");
  const create = useCreateGitHubPr();

  const handleCreate = async () => {
    if (!connection || !repository) return;
    const selection = await selectGitHubRepository(connection.id, repository);
    const result = await create.mutateAsync({ improvementId, selectionId: selection.id });
    toast.success(`GitHub PR #${result.pr_number} created.`);
  };

  return (
    <Card>
      <CardHeader><CardTitle>GitHub Pull Request</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {!connection ? <p className="text-sm text-muted-foreground">Connect GitHub in Settings before creating a PR.</p> : null}
        <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" disabled={!enabled || !connection} onChange={(event) => setRepository(event.target.value)} value={repository}>
          <option value="">Select repository</option>
          {(repositories.data ?? []).filter((item) => item.permissions.push).map((item) => <option key={item.id} value={item.full_name}>{item.full_name} ({item.default_branch})</option>)}
        </select>
        <Button className="w-full" disabled={!enabled || !repository || create.isPending} onClick={handleCreate}>
          {create.isPending ? "Creating Branch, Commit, and PR..." : "Create GitHub PR"}
        </Button>
      </CardContent>
    </Card>
  );
}
