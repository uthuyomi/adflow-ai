"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listIdeaMonitoring, runIdeaMonitoring } from "@/lib/api/client";

export function useIdeaMonitoring(sessionId: string | null) {
  return useQuery({
    queryKey: ["idea-lab", "monitoring", sessionId],
    queryFn: () => listIdeaMonitoring(sessionId ?? ""),
    enabled: Boolean(sessionId),
  });
}

export function useRunIdeaMonitoring(sessionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { query?: string | null; monitoring_type?: string; max_evidence_items?: number }) =>
      runIdeaMonitoring({ session_id: sessionId ?? "", ...payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["idea-lab", "monitoring", sessionId] }),
  });
}
