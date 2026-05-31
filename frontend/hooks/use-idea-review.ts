"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getIdeaReview, runIdeaReview } from "@/lib/api/client";

export function useIdeaReview(sessionId: string | null) {
  return useQuery({
    queryKey: ["idea-lab", "review", sessionId],
    queryFn: () => getIdeaReview(sessionId ?? ""),
    enabled: Boolean(sessionId),
    retry: false,
  });
}

export function useRunIdeaReview(sessionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (maxEvidenceItems: number) =>
      runIdeaReview({ session_id: sessionId ?? "", max_evidence_items: maxEvidenceItems }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["idea-lab", "review", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["idea-lab", "backlog", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["idea-lab", "roadmap", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["idea-lab", "session", sessionId] });
    },
  });
}
