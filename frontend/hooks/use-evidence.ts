"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { collectEvidence, listEvidenceByPair, listEvidenceByProject, listEvidenceClusters, searchEvidence } from "@/lib/api/client";
import type { JsonRecord } from "@/lib/types/adflow";

export function useEvidenceByPair(pairId: string | undefined) {
  return useQuery({
    queryKey: ["evidence", "pair", pairId],
    queryFn: () => listEvidenceByPair(pairId ?? ""),
    enabled: Boolean(pairId),
  });
}

export function useEvidenceByProject(projectId: string | undefined | null) {
  return useQuery({
    queryKey: ["evidence", "project", projectId],
    queryFn: () => listEvidenceByProject(projectId ?? ""),
    enabled: Boolean(projectId),
  });
}

export function useEvidenceClusters(projectId: string | undefined | null, pairId?: string | null) {
  return useQuery({
    queryKey: ["evidence-clusters", projectId, pairId],
    queryFn: () => listEvidenceClusters(projectId ?? "", pairId),
    enabled: Boolean(projectId),
  });
}

export function useCollectEvidence(pairId: string, projectId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      query: string;
      sources?: string[];
      max_items?: number;
      manual_items?: JsonRecord[];
    }) =>
      collectEvidence({
        project_id: projectId ?? "",
        ad_lp_pair_id: pairId,
        query: payload.query,
        sources: payload.sources ?? ["manual", "mock"],
        max_items: payload.max_items ?? 500,
        manual_items: payload.manual_items ?? [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence", "pair", pairId] });
      queryClient.invalidateQueries({ queryKey: ["evidence-clusters", projectId, pairId] });
    },
  });
}

export function useSearchEvidence() {
  return useMutation({
    mutationFn: searchEvidence,
  });
}
