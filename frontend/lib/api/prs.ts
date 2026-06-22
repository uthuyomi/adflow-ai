"use client";

import { getApiBaseUrl } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type GitHubConnection = {
  id: string;
  github_login: string | null;
  account_login: string | null;
  auth_type: "GITHUB_APP" | "LEGACY_TOKEN";
  status: string;
  migration_required?: boolean;
  last_verified_at: string | null;
};
export type GitHubRepository = { id: string; full_name: string; default_branch: string; permissions: Record<string, boolean> };
export type GitHubSelection = { id: string; repository_full_name: string; default_branch: string };
export type GitHubConfiguration = { app_enabled: boolean };
export type GitHubPullRequest = {
  id: string; improvement_id: string; repository: string; branch_name: string; commit_sha: string | null;
  pr_number: number | null; pr_url: string | null; pr_title: string; status: "CREATING" | "OPEN" | "MERGED" | "CLOSED" | "FAILED";
  created_at: string; last_synced_at: string | null; error_message: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  if (!data.session?.access_token) throw new Error("Login is required.");
  const response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export const getPullRequests = () => request<GitHubPullRequest[]>("/integrations/github/pull-requests");
export const listGitHubConnections = () => request<GitHubConnection[]>("/integrations/github/connections");
export const getGitHubConfiguration = () => request<GitHubConfiguration>("/integrations/github/configuration");
export const startGitHubAppInstall = () => request<{ authorization_url: string }>("/integrations/github/app/install", { method: "POST", body: JSON.stringify({ return_path: "/settings" }) });
export const claimGitHubAppInstallation = () => request<GitHubConnection>("/integrations/github/app/claim", { method: "POST" });
export const revokeGitHubConnection = (id: string) => request<GitHubConnection>(`/integrations/github/connections/${id}/revoke`, { method: "POST" });
export const listGitHubRepositories = (id: string) => request<GitHubRepository[]>(`/integrations/github/connections/${id}/repositories`);
export const selectGitHubRepository = (connection_id: string, repository: string) => request<GitHubSelection>("/integrations/github/repositories/select", { method: "POST", body: JSON.stringify({ connection_id, repository }) });
export const createGitHubPullRequest = (improvement_id: string, repository_selection_id: string) => request<GitHubPullRequest>("/integrations/github/pull-requests", { method: "POST", body: JSON.stringify({ improvement_id, repository_selection_id }) });
export const syncGitHubPullRequest = (id: string) => request<GitHubPullRequest>(`/integrations/github/pull-requests/${id}/sync`, { method: "POST" });
export const syncAllGitHubPullRequests = () => request<GitHubPullRequest[]>("/integrations/github/pull-requests/sync-all", { method: "POST" });
