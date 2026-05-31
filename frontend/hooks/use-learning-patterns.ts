"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listLearningPatterns, refreshLearningPatterns } from "@/lib/api/client";

export function useLearningPatterns(projectId: string | undefined | null) {
  return useQuery({
    queryKey: ["learning-patterns", projectId],
    queryFn: () => listLearningPatterns(projectId ?? ""),
    enabled: Boolean(projectId),
  });
}

export function useRefreshLearningPatterns(projectId: string | undefined | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => refreshLearningPatterns(projectId ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-patterns", projectId] });
    },
  });
}
