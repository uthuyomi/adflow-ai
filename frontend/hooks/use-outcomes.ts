"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getOutcome, getOutcomeStats, listOutcomes, measureOutcome, refreshOutcome, transitionOutcome, type OutcomeFilters } from "@/lib/api/outcomes";
import type { ImprovementOutcomeStatus, JsonRecord } from "@/lib/types/adflow";

export function useOutcomes(filters: OutcomeFilters) { return useQuery({ queryKey: ["outcomes", filters], queryFn: () => listOutcomes(filters) }); }
export function useOutcome(id: string) { return useQuery({ queryKey: ["outcome", id], queryFn: () => getOutcome(id), enabled: Boolean(id) }); }
export function useOutcomeStats() { return useQuery({ queryKey: ["outcome-stats"], queryFn: getOutcomeStats }); }
export function useOutcomeActions(id: string) {
  const client = useQueryClient();
  const invalidate = () => { client.invalidateQueries({ queryKey: ["outcome", id] }); client.invalidateQueries({ queryKey: ["outcomes"] }); client.invalidateQueries({ queryKey: ["outcome-stats"] }); client.invalidateQueries({ queryKey: ["outcomes-dashboard"] }); };
  return {
    measure: useMutation({ mutationFn: (payload: { before_metrics: JsonRecord; after_metrics: JsonRecord; measurement_method: string; measurement_source?: string; evidence_data?: JsonRecord[]; evaluation_thresholds?: JsonRecord; measurement_period?: JsonRecord }) => measureOutcome(id, payload), onSuccess: invalidate }),
    transition: useMutation({ mutationFn: ({ status, reason }: { status: ImprovementOutcomeStatus; reason: string }) => transitionOutcome(id, status, reason), onSuccess: invalidate }),
    refresh: useMutation({ mutationFn: (connector: string) => refreshOutcome(id, connector), onSuccess: invalidate }),
  };
}
