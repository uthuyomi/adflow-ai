"use client";

import { useQuery } from "@tanstack/react-query";

import { listIdeaBacklog } from "@/lib/api/client";

export function useIdeaBacklog(sessionId: string | null) {
  return useQuery({
    queryKey: ["idea-lab", "backlog", sessionId],
    queryFn: () => listIdeaBacklog(sessionId ?? ""),
    enabled: Boolean(sessionId),
  });
}
