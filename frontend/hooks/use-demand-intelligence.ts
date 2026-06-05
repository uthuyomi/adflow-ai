"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getApiBaseUrl } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUiStore } from "@/lib/store";
import type {
  DemandIntelligenceRun,
  DemandIntelligenceSignal,
  DemandMarketSizeEstimate,
  DemandOutcomeLearningLink,
  DemandSearchSignal,
  DemandSignalSnapshot,
  DemandSignalValidation,
  DemandSolutionFit,
  DemandSourceRun,
  JsonRecord,
} from "@/lib/types/adflow";

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

export function useDemandIntelligenceRuns(pairId: string | undefined) {
  return useQuery({
    queryKey: ["demand-intelligence-runs", pairId],
    queryFn: () => requestWithAuth<DemandIntelligenceRun[]>(`/demand-intelligence/pairs/${pairId}/runs`),
    enabled: Boolean(pairId),
  });
}

export function useLatestDemandIntelligence(pairId: string | undefined) {
  return useQuery({
    queryKey: ["demand-intelligence-latest", pairId],
    queryFn: () => requestWithAuth<DemandIntelligenceRun>(`/demand-intelligence/pairs/${pairId}/latest`),
    enabled: Boolean(pairId),
    retry: false,
  });
}

export function useDemandRun(runId: string | undefined) {
  return useQuery({
    queryKey: ["demand-run", runId],
    queryFn: () => requestWithAuth<DemandIntelligenceRun>(`/demand-intelligence/runs/${runId}`),
    enabled: Boolean(runId),
  });
}

export function useDemandSignals(runId: string | undefined) {
  return useQuery({
    queryKey: ["demand-signals", runId],
    queryFn: () => requestWithAuth<DemandIntelligenceSignal[]>(`/demand-intelligence/runs/${runId}/signals`),
    enabled: Boolean(runId),
  });
}

export function useDemandClusters(runId: string | undefined) {
  return useQuery({
    queryKey: ["demand-clusters", runId],
    queryFn: () => requestWithAuth<JsonRecord[]>(`/demand-intelligence/runs/${runId}/clusters`),
    enabled: Boolean(runId),
  });
}

export function useDemandValidations(runId: string | undefined) {
  return useQuery({
    queryKey: ["demand-validations", runId],
    queryFn: () => requestWithAuth<DemandSignalValidation[]>(`/demand-intelligence/runs/${runId}/validations`),
    enabled: Boolean(runId),
  });
}

export function useDemandSolutionFits(runId: string | undefined) {
  return useQuery({
    queryKey: ["demand-solution-fits", runId],
    queryFn: () => requestWithAuth<DemandSolutionFit[]>(`/demand-intelligence/runs/${runId}/solution-fits`),
    enabled: Boolean(runId),
  });
}

export function useDemandSnapshots(runId: string | undefined) {
  return useQuery({
    queryKey: ["demand-snapshots", runId],
    queryFn: () => requestWithAuth<DemandSignalSnapshot[]>(`/demand-intelligence/runs/${runId}/snapshots`),
    enabled: Boolean(runId),
  });
}

export function useDemandSourceRuns(runId: string | undefined) {
  return useQuery({
    queryKey: ["demand-source-runs", runId],
    queryFn: () => requestWithAuth<DemandSourceRun[]>(`/demand-intelligence/runs/${runId}/source-runs`),
    enabled: Boolean(runId),
  });
}

export function useDemandSearchDemand(runId: string | undefined) {
  return useQuery({
    queryKey: ["demand-search-demand", runId],
    queryFn: () => requestWithAuth<DemandSearchSignal[]>(`/demand-intelligence/runs/${runId}/search-demand`),
    enabled: Boolean(runId),
  });
}

export function useDemandMarketSize(runId: string | undefined) {
  return useQuery({
    queryKey: ["demand-market-size", runId],
    queryFn: () => requestWithAuth<DemandMarketSizeEstimate[]>(`/demand-intelligence/runs/${runId}/market-size`),
    enabled: Boolean(runId),
  });
}

export function useDemandOutcomeLearning(runId: string | undefined) {
  return useQuery({
    queryKey: ["demand-outcome-learning", runId],
    queryFn: () => requestWithAuth<DemandOutcomeLearningLink[]>(`/demand-intelligence/runs/${runId}/outcome-learning`),
    enabled: Boolean(runId),
  });
}

export function useRebuildDemandOutcomeLearning(runId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      requestWithAuth<{ links: DemandOutcomeLearningLink[]; summary: JsonRecord }>(`/demand-intelligence/runs/${runId}/outcome-learning/rebuild`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demand-outcome-learning", runId] });
      queryClient.invalidateQueries({ queryKey: ["demand-run", runId] });
      queryClient.invalidateQueries({ queryKey: ["demand-intelligence-latest"] });
    },
  });
}

export function useDemandEvidence(runId: string | undefined) {
  return useQuery({
    queryKey: ["demand-evidence", runId],
    queryFn: () => requestWithAuth<DemandIntelligenceSignal[]>(`/demand-intelligence/runs/${runId}/evidence`),
    enabled: Boolean(runId),
  });
}

export function usePairDemandMonitoring(pairId: string | undefined) {
  return useQuery({
    queryKey: ["pair-demand-monitoring", pairId],
    queryFn: () => requestWithAuth<{ snapshots: DemandSignalSnapshot[]; emerging_clusters: DemandSignalSnapshot[]; growing_clusters: DemandSignalSnapshot[]; declining_clusters: DemandSignalSnapshot[] }>(`/demand-intelligence/pairs/${pairId}/monitoring`),
    enabled: Boolean(pairId),
  });
}

export function useRunSolutionFit(runId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fitTargetType, fitTargetText }: { fitTargetType: string; fitTargetText: string }) =>
      requestWithAuth<{ fits: DemandSolutionFit[]; summary: JsonRecord }>(`/demand-intelligence/runs/${runId}/solution-fit`, {
        method: "POST",
        body: JSON.stringify({
          fit_target_type: fitTargetType,
          fit_target_text: fitTargetText,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demand-solution-fits", runId] });
      queryClient.invalidateQueries({ queryKey: ["demand-run", runId] });
    },
  });
}

export function useRunDemandIntelligence(pairId: string) {
  const queryClient = useQueryClient();
  const locale = useUiStore((state) => state.locale);
  return useMutation({
    mutationFn: ({
      projectId,
      query,
    }: {
      projectId?: string | null;
      query: string;
    }) =>
      requestWithAuth<{ run_id: string; status: string; run: DemandIntelligenceRun }>("/demand-intelligence/run", {
        method: "POST",
        body: JSON.stringify({
          project_id: projectId ?? null,
          ad_lp_pair_id: pairId,
          query,
          locale,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demand-intelligence-runs", pairId] });
      queryClient.invalidateQueries({ queryKey: ["demand-intelligence-latest", pairId] });
      queryClient.invalidateQueries({ queryKey: ["analysis-runs", pairId] });
    },
  });
}
