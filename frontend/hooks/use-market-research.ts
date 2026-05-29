"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getApiBaseUrl } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MarketResearchRun } from "@/lib/types/adflow";

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

export function useMarketResearchRuns(pairId: string | undefined) {
  return useQuery({
    queryKey: ["market-research-runs", pairId],
    queryFn: () => requestWithAuth<MarketResearchRun[]>(`/market-research/pairs/${pairId}/runs`),
    enabled: Boolean(pairId),
  });
}

export function useLatestMarketResearch(pairId: string | undefined) {
  return useQuery({
    queryKey: ["market-research-latest", pairId],
    queryFn: () => requestWithAuth<MarketResearchRun>(`/market-research/pairs/${pairId}/latest`),
    enabled: Boolean(pairId),
    retry: false,
  });
}

export function useRunMarketResearch(pairId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      query,
    }: {
      projectId?: string | null;
      query: string;
    }) =>
      requestWithAuth<{ run_id: string; status: string; run: MarketResearchRun }>("/market-research/run", {
        method: "POST",
        body: JSON.stringify({
          project_id: projectId ?? null,
          ad_lp_pair_id: pairId,
          query,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-research-runs", pairId] });
      queryClient.invalidateQueries({ queryKey: ["market-research-latest", pairId] });
      queryClient.invalidateQueries({ queryKey: ["analysis-runs", pairId] });
    },
  });
}
