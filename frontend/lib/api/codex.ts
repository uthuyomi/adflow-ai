"use client";

import { getApiBaseUrl } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CodexExecution, CodexTaskDetail, CodexTaskPrompt } from "@/lib/types/adflow";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  if (!data.session?.access_token) throw new Error("Login is required.");
  const response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export type CodexTaskList = { items: CodexTaskPrompt[]; total: number; page: number; page_size: number };
export type CodexConfiguration = { real_execution_enabled: boolean; manual_execution_enabled: boolean; mock_execution_enabled: boolean; workspace_strategy: "ISOLATED_CLONE" };
export const listCodexTasks = (query = "") => request<CodexTaskList>(`/codex-tasks${query ? `?${query}` : ""}`);
export const getCodexConfiguration = () => request<CodexConfiguration>("/codex-tasks/configuration");
export const getCodexTask = (id: string) => request<CodexTaskDetail>(`/codex-tasks/${id}`);
export const createCodexTask = (improvementId: string) => request<CodexTaskPrompt>(`/orchestration/results/${improvementId}/codex-task`, { method: "POST", body: JSON.stringify({ idempotency_key: `create-${improvementId}` }) });
export const executeCodexManual = (id: string, payload: Record<string, unknown>) => request<{ task: CodexTaskPrompt; execution: CodexExecution }>(`/codex-tasks/${id}/execute/manual`, { method: "POST", body: JSON.stringify(payload) });
export const executeCodexReal = (id: string, repository_selection_id: string) => request<{ task: CodexTaskPrompt; execution: CodexExecution }>(`/codex-tasks/${id}/execute/real`, { method: "POST", body: JSON.stringify({ idempotency_key: `real-${id}-${crypto.randomUUID()}`, repository_selection_id }) });
export const cancelCodexTask = (id: string) => request<CodexTaskPrompt>(`/codex-tasks/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason: "Cancelled by user." }) });
export const createCodexPr = (id: string, execution_id: string, repository_selection_id: string) => request<Record<string, unknown>>(`/codex-tasks/${id}/pull-request`, { method: "POST", body: JSON.stringify({ execution_id, repository_selection_id, idempotency_key: `pr-${id}-${execution_id}` }) });
export const createCodexOutcome = (id: string) => request<Record<string, unknown>>(`/orchestration/codex-tasks/${id}/outcome`, { method: "POST", body: JSON.stringify({ idempotency_key: `outcome-${id}` }) });
