"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getApiBaseUrl } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AIAgent, AIAgentResult, AIAgentScorecard, AIOrchestrationRun } from "@/lib/types/adflow";
import { createCodexTask } from "@/lib/api/codex";

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

export function useAIAgents() {
  return useQuery({
    queryKey: ["ai-agents"],
    queryFn: () => requestWithAuth<AIAgent[]>("/orchestration/agents"),
  });
}

export function useAIOrchestrationRuns() {
  return useQuery({
    queryKey: ["ai-orchestration-runs"],
    queryFn: () => requestWithAuth<AIOrchestrationRun[]>("/orchestration/runs"),
  });
}

export function useAIAgentScorecards() {
  return useQuery({
    queryKey: ["ai-agent-scorecards"],
    queryFn: () => requestWithAuth<AIAgentScorecard[]>("/orchestration/scorecards"),
  });
}

export function useAIAgentResults(runId: string | undefined) {
  return useQuery({
    queryKey: ["ai-agent-results", runId],
    queryFn: () => requestWithAuth<AIAgentResult[]>(`/orchestration/runs/${runId}/results`),
    enabled: Boolean(runId),
  });
}

export function useAIAgentDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      resultId,
      decision_status,
      decision_reason,
    }: {
      resultId: string;
      decision_status: AIAgentResult["decision_status"];
      decision_reason?: string;
    }) =>
      requestWithAuth<AIAgentResult>(`/orchestration/results/${resultId}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision_status, decision_reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-agent-results"] });
      queryClient.invalidateQueries({ queryKey: ["ai-agent-scorecards"] });
      queryClient.invalidateQueries({ queryKey: ["analysis-runs"] });
      queryClient.invalidateQueries({ queryKey: ["improvements"] });
      queryClient.invalidateQueries({ queryKey: ["improvement-stats"] });
    },
  });
}

export function useGenerateCodexTask() {
  return useMutation({
    mutationFn: (resultId: string) =>
      createCodexTask(resultId),
  });
}
