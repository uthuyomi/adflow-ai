"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getApiBaseUrl } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { listAnalysisRuns } from "@/lib/supabase/adflow-repository";
import type { AnalysisRun } from "@/lib/types/adflow";

export type AnalysisAIMode = "multi_provider" | "openai_only";

export function useAnalysisRuns(pairId: string) {
  return useQuery({
    queryKey: ["analysis-runs", pairId],
    queryFn: () => listAnalysisRuns(pairId),
    enabled: Boolean(pairId),
  });
}

export function useRunPairAnalysis(pairId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (aiMode?: AnalysisAIMode): Promise<AnalysisRun> => {
      const selectedMode = aiMode ?? "multi_provider";
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Login is required.");
      const response = await fetch(`${getApiBaseUrl()}/analysis/pairs/${pairId}/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ai_mode: selectedMode }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-runs", pairId] });
      queryClient.invalidateQueries({ queryKey: ["ad-lp-pairs"] });
    },
  });
}
