"use client";

import { useQuery } from "@tanstack/react-query";

import { getIdeaRoadmap } from "@/lib/api/client";

export function useIdeaRoadmap(sessionId: string | null) {
  return useQuery({
    queryKey: ["idea-lab", "roadmap", sessionId],
    queryFn: () => getIdeaRoadmap(sessionId ?? ""),
    enabled: Boolean(sessionId),
    retry: false,
  });
}
