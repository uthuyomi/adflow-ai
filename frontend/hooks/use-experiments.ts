"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collectExperiment, evaluateExperiment, getExperiment, getExperimentDashboard, listExperiments, transitionExperiment, type ExperimentStatus } from "@/lib/api/experiments";

export function useExperiments(filters: { project_id?: string; status?: string } = {}) {
  return useQuery({ queryKey: ["experiments", filters], queryFn: () => listExperiments(filters) });
}
export function useExperiment(id: string) {
  return useQuery({ queryKey: ["experiment", id], queryFn: () => getExperiment(id), enabled: Boolean(id) });
}
export function useExperimentDashboard() {
  return useQuery({ queryKey: ["experiment-dashboard"], queryFn: getExperimentDashboard });
}
export function useExperimentActions(id: string) {
  const client = useQueryClient();
  const invalidate = () => {
    client.invalidateQueries({ queryKey: ["experiment", id] });
    client.invalidateQueries({ queryKey: ["experiments"] });
    client.invalidateQueries({ queryKey: ["experiment-dashboard"] });
  };
  return {
    transition: useMutation({ mutationFn: ({ status, reason }: { status: ExperimentStatus; reason?: string }) => transitionExperiment(id, status, reason), onSuccess: invalidate }),
    collect: useMutation({ mutationFn: () => collectExperiment(id), onSuccess: invalidate }),
    evaluate: useMutation({ mutationFn: (complete: boolean) => evaluateExperiment(id, complete), onSuccess: invalidate }),
  };
}
