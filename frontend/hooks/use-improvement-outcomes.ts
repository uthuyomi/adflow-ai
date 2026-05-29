"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getApiBaseUrl } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ImprovementOutcome, ImprovementOutcomeStatus, JsonRecord } from "@/lib/types/adflow";

async function requestWithAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Login is required.");
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export function useImprovementOutcomes(pairId: string | undefined) {
  return useQuery({
    queryKey: ["improvement-outcomes", pairId],
    queryFn: () => requestWithAuth<ImprovementOutcome[]>(`/outcomes/pairs/${pairId}`),
    enabled: Boolean(pairId),
  });
}

export function useLatestImprovementOutcome(pairId: string | undefined) {
  return useQuery({
    queryKey: ["improvement-outcome-latest", pairId],
    queryFn: () => requestWithAuth<ImprovementOutcome>(`/outcomes/pairs/${pairId}/latest`),
    enabled: Boolean(pairId),
    retry: false,
  });
}

export function useCreateImprovementOutcome(pairId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      project_id?: string | null;
      ad_lp_pair_id: string;
      source_ai_result_id?: string | null;
      source_codex_task_id?: string | null;
      title: string;
      description?: string | null;
      before_metrics?: JsonRecord;
      after_metrics?: JsonRecord;
    }) =>
      requestWithAuth<ImprovementOutcome>("/outcomes", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["improvement-outcomes", pairId] });
      queryClient.invalidateQueries({ queryKey: ["improvement-outcome-latest", pairId] });
      queryClient.invalidateQueries({ queryKey: ["outcomes-dashboard"] });
    },
  });
}

export function useUpdateImprovementOutcome(pairId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ outcomeId, payload }: {
      outcomeId: string;
      payload: Partial<{
        implemented_at: string | null;
        measured_at: string | null;
        before_metrics: JsonRecord;
        after_metrics: JsonRecord;
        outcome_status: ImprovementOutcomeStatus;
        outcome_summary: string | null;
        learning_notes: string | null;
        title: string;
        description: string | null;
      }>;
    }) =>
      requestWithAuth<ImprovementOutcome>(`/outcomes/${outcomeId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["improvement-outcomes", pairId] });
      queryClient.invalidateQueries({ queryKey: ["improvement-outcome-latest", pairId] });
      queryClient.invalidateQueries({ queryKey: ["analysis-runs", pairId] });
      queryClient.invalidateQueries({ queryKey: ["outcomes-dashboard"] });
    },
  });
}

export function useCreateOutcomeFromAIResult(pairId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resultId: string) =>
      requestWithAuth<ImprovementOutcome>(`/orchestration/results/${resultId}/outcome`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["improvement-outcomes", pairId] });
      queryClient.invalidateQueries({ queryKey: ["improvement-outcome-latest", pairId] });
      queryClient.invalidateQueries({ queryKey: ["outcomes-dashboard"] });
    },
  });
}
