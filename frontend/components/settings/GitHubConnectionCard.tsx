"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { connectGitHubToken, getGitHubConfiguration, listGitHubConnections, revokeGitHubConnection, startGitHubOAuth } from "@/lib/api/prs";

export function GitHubConnectionCard() {
  const client = useQueryClient();
  const connections = useQuery({ queryKey: ["github-connections"], queryFn: listGitHubConnections });
  const configuration = useQuery({ queryKey: ["github-configuration"], queryFn: getGitHubConfiguration });
  const [token, setToken] = useState("");
  const refresh = () => client.invalidateQueries({ queryKey: ["github-connections"] });
  return (
    <Card>
      <CardHeader><CardTitle>GitHub connection</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {(connections.data ?? []).map((item) => <div className="flex items-center justify-between rounded-md border p-3 text-sm" key={item.id}><span>{item.github_login} / {item.status}</span><Button size="sm" variant="outline" onClick={async () => { await revokeGitHubConnection(item.id); await refresh(); }}>Disconnect</Button></div>)}
        {configuration.data?.oauth_enabled ? <Button onClick={async () => { const result = await startGitHubOAuth(); window.location.href = result.authorization_url; }}>Connect with GitHub OAuth</Button> : null}
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input type="password" placeholder="Fine-grained or classic GitHub token" value={token} onChange={(event) => setToken(event.target.value)} />
          <Button variant="outline" disabled={!token} onClick={async () => { await connectGitHubToken(token); setToken(""); await refresh(); toast.success("GitHub connected."); }}>Connect token</Button>
        </div>
      </CardContent>
    </Card>
  );
}
