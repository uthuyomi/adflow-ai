"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createIdeaSession, getIdeaSession, listIdeaSessions } from "@/lib/api/client";

export function useIdeaSessions() {
  return useQuery({
    queryKey: ["idea-lab", "sessions"],
    queryFn: listIdeaSessions,
  });
}

export function useIdeaSession(sessionId: string | null) {
  return useQuery({
    queryKey: ["idea-lab", "session", sessionId],
    queryFn: () => getIdeaSession(sessionId ?? ""),
    enabled: Boolean(sessionId),
  });
}

export function useCreateIdeaSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createIdeaSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["idea-lab", "sessions"] }),
  });
}
