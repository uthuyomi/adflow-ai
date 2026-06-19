"use client";

import { getApiBaseUrl } from "@/lib/api/client";
import { apiErrorFromResponse } from "@/lib/api/errors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  if (!data.session?.access_token) throw new Error("Login is required.");
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw await apiErrorFromResponse(response);
  return response.json() as Promise<T>;
}

export type ProjectStatus = "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
export type WorkspaceProject = {
  id: string; user_id: string; name: string; description: string | null; status: ProjectStatus; archived_at: string | null;
  deleted_at: string | null; duplicated_from: string | null; created_at: string; updated_at: string;
};
export type SearchResult = {
  result_type: string; result_id: string; project_id: string | null; title: string; subtitle: string; target_url: string; updated_at: string;
};
export type Notification = {
  id: string; category: string; title: string; body: string; target_url: string | null; read_at: string | null; created_at: string;
};
export type ActivityEvent = {
  id: string; project_id: string | null; category: string; action: string; entity_type: string; entity_id: string | null; title: string; summary: string; created_at: string;
};
export type BackgroundJob = {
  id: string; job_type: string; status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED"; error_message: string | null; attempt_count: number; created_at: string;
};
export type OperationsDashboard = {
  active_projects: number; latest_discovery: Array<Record<string, unknown>>; latest_research: Array<Record<string, unknown>>;
  pending_improvements: number; codex_tasks: number; open_prs: number; pending_outcomes: number; unread_notifications: number; failed_jobs: number;
  recent_activity: ActivityEvent[];
};
export type WorkspaceSettings = {
  timezone: string; locale: "ja" | "en"; default_view: string; display_density: "compact" | "comfortable";
  search_preferences: Record<string, unknown>; notification_preferences: Record<string, unknown>;
};
export type SavedView = { id: string; name: string; view_type: string; filters: Record<string, unknown>; search_query: string; is_favorite: boolean; is_shared: boolean; updated_at: string };

export const listWorkspaceProjects = (status?: ProjectStatus) => request<WorkspaceProject[]>(`/operations/projects${status ? `?status=${status}` : ""}`);
export const createWorkspaceProject = (payload: { name: string; description?: string | null }) => request<WorkspaceProject>("/operations/projects", { method: "POST", body: JSON.stringify(payload) });
export const updateWorkspaceProject = (id: string, payload: Partial<Pick<WorkspaceProject, "name" | "description" | "status">>) => request<WorkspaceProject>(`/operations/projects/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const duplicateWorkspaceProject = (id: string) => request<WorkspaceProject>(`/operations/projects/${id}/duplicate`, { method: "POST" });
export const searchWorkspace = (query: string) => request<SearchResult[]>(`/operations/search?q=${encodeURIComponent(query)}`);
export const getOperationsDashboard = () => request<OperationsDashboard>("/operations/dashboard");
export const listNotifications = () => request<Notification[]>("/operations/notifications");
export const markNotification = (id: string, read = true) => request<Notification>(`/operations/notifications/${id}`, { method: "PATCH", body: JSON.stringify({ read }) });
export const deleteNotification = (id: string) => request<void>(`/operations/notifications/${id}`, { method: "DELETE" });
export const listActivity = (projectId?: string) => request<ActivityEvent[]>(`/operations/activity${projectId ? `?project_id=${projectId}` : ""}`);
export const listJobs = () => request<BackgroundJob[]>("/operations/jobs");
export const retryJob = (id: string) => request<BackgroundJob>(`/operations/jobs/${id}/retry`, { method: "POST" });
export const listSavedViews = () => request<SavedView[]>("/operations/saved-views");
export const createSavedView = (payload: Omit<SavedView, "id" | "updated_at">) => request<SavedView>("/operations/saved-views", { method: "POST", body: JSON.stringify({ ...payload, sort: {} }) });
export const deleteSavedView = (id: string) => request<void>(`/operations/saved-views/${id}`, { method: "DELETE" });
export const getWorkspaceSettings = () => request<WorkspaceSettings>("/operations/settings");
export const updateWorkspaceSettings = (payload: Partial<WorkspaceSettings>) => request<WorkspaceSettings>("/operations/settings", { method: "PATCH", body: JSON.stringify(payload) });
