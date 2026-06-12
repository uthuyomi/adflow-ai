import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/hooks/useAdflowData";
import {
  getImprovementDetail,
  getImprovementHistory,
  getImprovements,
  getImprovementStats,
  transitionImprovement,
} from "@/lib/api/improvements";

export function useImprovements() {
  return useQuery({ queryKey: queryKeys.improvements, queryFn: getImprovements });
}

export function useImprovement(improvementId: string) {
  return useQuery({
    queryKey: queryKeys.improvement(improvementId),
    queryFn: () => getImprovementDetail(improvementId),
    enabled: Boolean(improvementId),
  });
}

export function useImprovementHistory(improvementId: string) {
  return useQuery({
    queryKey: ["improvement-history", improvementId],
    queryFn: () => getImprovementHistory(improvementId),
    enabled: Boolean(improvementId),
  });
}

export function useImprovementStats() {
  return useQuery({ queryKey: ["improvement-stats"], queryFn: getImprovementStats });
}

export function useTransitionImprovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transitionImprovement,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.improvements });
      void queryClient.invalidateQueries({ queryKey: queryKeys.improvement(result.id) });
      void queryClient.invalidateQueries({ queryKey: ["improvement-history", result.id] });
      void queryClient.invalidateQueries({ queryKey: ["improvement-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["ai-agent-results"] });
      void queryClient.invalidateQueries({ queryKey: ["ai-agent-scorecards"] });
    },
  });
}
