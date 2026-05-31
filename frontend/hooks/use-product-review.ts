"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getLatestProductReview, listProductReviewRuns, runProductReview } from "@/lib/api/client";
import type { ProductReviewRequest } from "@/lib/types/adflow";

export function useProductReviewRuns(projectId: string | undefined | null) {
  return useQuery({
    queryKey: ["product-review-runs", projectId],
    queryFn: () => listProductReviewRuns(projectId ?? ""),
    enabled: Boolean(projectId),
  });
}

export function useLatestProductReview(projectId: string | undefined | null, pairId?: string | null) {
  return useQuery({
    queryKey: ["product-review-latest", projectId, pairId],
    queryFn: () => getLatestProductReview(projectId ?? "", pairId),
    enabled: Boolean(projectId),
    retry: false,
  });
}

export function useRunProductReview(projectId: string | undefined | null, pairId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<ProductReviewRequest, "project_id" | "ad_lp_pair_id">) =>
      runProductReview({
        ...payload,
        project_id: projectId ?? "",
        ad_lp_pair_id: pairId ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-review-runs", projectId] });
      queryClient.invalidateQueries({ queryKey: ["product-review-latest", projectId, pairId] });
      queryClient.invalidateQueries({ queryKey: ["product-backlog", projectId] });
      queryClient.invalidateQueries({ queryKey: ["evidence", "pair", pairId] });
      queryClient.invalidateQueries({ queryKey: ["evidence-clusters", projectId, pairId] });
    },
  });
}
