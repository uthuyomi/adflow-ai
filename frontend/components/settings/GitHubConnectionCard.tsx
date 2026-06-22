"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { claimGitHubAppInstallation, getGitHubConfiguration, listGitHubConnections, revokeGitHubConnection, startGitHubAppInstall } from "@/lib/api/prs";

export function GitHubConnectionCard() {
  const client = useQueryClient();
  const connections = useQuery({ queryKey: ["github-connections"], queryFn: listGitHubConnections });
  const configuration = useQuery({ queryKey: ["github-configuration"], queryFn: getGitHubConfiguration });
  const refresh = () => client.invalidateQueries({ queryKey: ["github-connections"] });
  return (
    <Card>
      <CardHeader><CardTitle>GitHub connection</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {(connections.data ?? []).map((item) => <div className="flex items-center justify-between rounded-md border p-3 text-sm" key={item.id}><span>{item.account_login || item.github_login} / {item.migration_required ? "reinstall required" : item.status}</span>{!item.migration_required ? <Button size="sm" variant="outline" onClick={async () => { await revokeGitHubConnection(item.id); await refresh(); }}>Disconnect</Button> : null}</div>)}
        {configuration.data?.app_enabled ? <Button onClick={async () => { const result = await startGitHubAppInstall(); window.location.href = result.authorization_url; }}>Install GitHub App</Button> : <p className="text-sm text-muted-foreground">GitHub App is not configured on the backend.</p>}
        {configuration.data?.app_enabled && !(connections.data ?? []).some((item) => item.status === "active" && item.auth_type === "GITHUB_APP") ? <Button variant="outline" onClick={async () => { await claimGitHubAppInstallation(); await refresh(); }}>Complete installed GitHub App connection</Button> : null}
        <p className="text-xs text-muted-foreground">Only repositories selected during installation are accessible. Personal access tokens are not accepted.</p>
      </CardContent>
    </Card>
  );
}
