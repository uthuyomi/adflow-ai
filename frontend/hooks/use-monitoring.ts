"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listIntelligenceAlerts, listMonitoringRuns, runMonitoring, updateIntelligenceAlert } from "@/lib/api/client";

export function useMonitoringRuns(projectId: string | undefined | null) {
  return useQuery({
    queryKey: ["monitoring-runs", projectId],
    queryFn: () => listMonitoringRuns(projectId ?? ""),
    enabled: Boolean(projectId),
  });
}

export function useIntelligenceAlerts(projectId: string | undefined | null, status?: string | null) {
  return useQuery({
    queryKey: ["intelligence-alerts", projectId, status],
    queryFn: () => listIntelligenceAlerts(projectId ?? "", status),
    enabled: Boolean(projectId),
  });
}

export function useRunMonitoring(projectId: string | undefined | null, pairId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { query: string; monitoring_type?: string; max_evidence_items?: number }) =>
      runMonitoring({
        project_id: projectId ?? "",
        ad_lp_pair_id: pairId ?? null,
        query: payload.query,
        monitoring_type: payload.monitoring_type ?? "market",
        max_evidence_items: payload.max_evidence_items ?? 100,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitoring-runs", projectId] });
      queryClient.invalidateQueries({ queryKey: ["intelligence-alerts", projectId] });
      queryClient.invalidateQueries({ queryKey: ["evidence", "pair", pairId] });
      queryClient.invalidateQueries({ queryKey: ["evidence-clusters", projectId, pairId] });
    },
  });
}

export function useUpdateIntelligenceAlert(projectId: string | undefined | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, payload }: { alertId: string; payload: { status?: string; severity?: string } }) =>
      updateIntelligenceAlert(alertId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intelligence-alerts", projectId] });
    },
  });
}
