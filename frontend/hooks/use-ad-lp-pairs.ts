"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createEntity, deleteEntity, getEntityById, listEntities, updateEntity } from "@/lib/supabase/adflow-repository";
import type { AdLpPair } from "@/lib/types/adflow";

const key = ["ad-lp-pairs"];
const select = "*, twitter_ads(*), landing_pages(*)";

export function useAdLpPairs() {
  return useQuery({ queryKey: key, queryFn: () => listEntities("ad_lp_pairs", select) });
}

export function useAdLpPair(pairId: string) {
  return useQuery({
    queryKey: [...key, pairId],
    queryFn: () => getEntityById("ad_lp_pairs", pairId, select),
    enabled: Boolean(pairId),
  });
}

export function useAdLpPairMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  return {
    create: useMutation({
      mutationFn: (payload: Partial<AdLpPair>) => createEntity("ad_lp_pairs", payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Partial<AdLpPair> }) =>
        updateEntity("ad_lp_pairs", id, payload),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteEntity("ad_lp_pairs", id),
      onSuccess: invalidate,
    }),
  };
}
