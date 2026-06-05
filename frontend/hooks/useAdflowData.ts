import { useQuery } from "@tanstack/react-query";

import { runWorkflow } from "@/lib/api/client";
import { listRecentDemandIntelligenceRuns, listRecentImprovementOutcomes } from "@/lib/supabase/adflow-repository";

export const queryKeys = {
  workflow: ["workflow"] as const,
  campaigns: ["campaigns"] as const,
  campaign: (id: string) => ["campaign", id] as const,
  lp: ["lp-analysis"] as const,
  improvements: ["improvements"] as const,
  improvement: (id: string) => ["improvement", id] as const,
  prs: ["pull-requests"] as const,
  demandIntelligence: ["demand-intelligence-dashboard"] as const,
  outcomes: ["outcomes-dashboard"] as const,
};

export function useWorkflow() {
  return useQuery({
    queryKey: queryKeys.workflow,
    queryFn: runWorkflow,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useDemandIntelligenceDashboard() {
  return useQuery({
    queryKey: queryKeys.demandIntelligence,
    queryFn: () => listRecentDemandIntelligenceRuns(10),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useOutcomesDashboard() {
  return useQuery({
    queryKey: queryKeys.outcomes,
    queryFn: () => listRecentImprovementOutcomes(20),
    staleTime: 60_000,
    retry: 1,
  });
}
