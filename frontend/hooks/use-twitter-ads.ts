"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createEntity, deleteEntity, getEntityById, listEntities, updateEntity } from "@/lib/supabase/adflow-repository";
import type { TwitterAd } from "@/lib/types/adflow";

const key = ["twitter-ads"];

export function useTwitterAds() {
  return useQuery({ queryKey: key, queryFn: () => listEntities("twitter_ads") });
}

export function useTwitterAd(adId: string) {
  return useQuery({
    queryKey: [...key, adId],
    queryFn: () => getEntityById("twitter_ads", adId),
    enabled: Boolean(adId),
  });
}

export function useTwitterAdMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  return {
    create: useMutation({
      mutationFn: (payload: Partial<TwitterAd>) => createEntity("twitter_ads", payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Partial<TwitterAd> }) =>
        updateEntity("twitter_ads", id, payload),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteEntity("twitter_ads", id),
      onSuccess: invalidate,
    }),
  };
}
