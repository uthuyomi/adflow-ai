import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/hooks/useAdflowData";
import {
  approveImprovement,
  createPullRequest,
  getImprovementDetail,
  getImprovements,
} from "@/lib/api/improvements";

export function useImprovements() {
  return useQuery({
    queryKey: queryKeys.improvements,
    queryFn: getImprovements,
  });
}

export function useImprovement(improvementId: string) {
  return useQuery({
    queryKey: queryKeys.improvement(improvementId),
    queryFn: () => getImprovementDetail(improvementId),
    enabled: Boolean(improvementId),
  });
}

export function useApproveImprovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveImprovement,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.improvements });
    },
  });
}

export function useCreatePullRequest() {
  return useMutation({
    mutationFn: createPullRequest,
  });
}
