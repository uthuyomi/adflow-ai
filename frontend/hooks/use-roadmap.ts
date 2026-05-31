"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { generateRoadmap, getLatestRoadmap, listRoadmaps } from "@/lib/api/client";

export function useRoadmaps(projectId: string | undefined | null) {
  return useQuery({
    queryKey: ["roadmaps", projectId],
    queryFn: () => listRoadmaps(projectId ?? ""),
    enabled: Boolean(projectId),
  });
}

export function useLatestRoadmap(projectId: string | undefined | null) {
  return useQuery({
    queryKey: ["roadmap-latest", projectId],
    queryFn: () => getLatestRoadmap(projectId ?? ""),
    enabled: Boolean(projectId),
    retry: false,
  });
}

export function useGenerateRoadmap(projectId: string | undefined | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: { product_review_run_id?: string | null; title?: string | null }) =>
      generateRoadmap(projectId ?? "", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps", projectId] });
      queryClient.invalidateQueries({ queryKey: ["roadmap-latest", projectId] });
    },
  });
}
