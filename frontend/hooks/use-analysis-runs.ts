"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getApiBaseUrl } from "@/lib/api/client";
import { apiErrorFromResponse } from "@/lib/api/errors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { listAnalysisRuns } from "@/lib/supabase/adflow-repository";
import type { AnalysisRun } from "@/lib/types/adflow";
import { useUiStore, type AnalysisAIMode } from "@/lib/store";

export function useAnalysisRuns(pairId: string) {
  return useQuery({
    queryKey: ["analysis-runs", pairId],
    queryFn: () => listAnalysisRuns(pairId),
    enabled: Boolean(pairId),
  });
}

export function useRunPairAnalysis(pairId: string) {
  const queryClient = useQueryClient();
  const locale = useUiStore((state) => state.locale);
  return useMutation({
    mutationFn: async (aiMode?: AnalysisAIMode): Promise<AnalysisRun> => {
      const selectedMode = aiMode ?? "openai_only";
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
        body: JSON.stringify({ ai_mode: selectedMode, locale }),
      });
      if (!response.ok) throw await apiErrorFromResponse(response);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-runs", pairId] });
      queryClient.invalidateQueries({ queryKey: ["ad-lp-pairs"] });
    },
  });
}
