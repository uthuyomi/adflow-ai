"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createEntity, deleteEntity, getEntityById, listEntities, listLandingPageVersions, updateEntity } from "@/lib/supabase/adflow-repository";
import type { LandingPage } from "@/lib/types/adflow";

const key = ["landing-pages"];

export function useLandingPages() {
  return useQuery({ queryKey: key, queryFn: () => listEntities("landing_pages") });
}

export function useLandingPage(lpId: string) {
  return useQuery({
    queryKey: [...key, lpId],
    queryFn: () => getEntityById("landing_pages", lpId),
    enabled: Boolean(lpId),
  });
}

export function useLandingPageVersions(lpId: string) {
  return useQuery({
    queryKey: [...key, lpId, "versions"],
    queryFn: () => listLandingPageVersions(lpId),
    enabled: Boolean(lpId),
  });
}

export function useLandingPageMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  return {
    create: useMutation({
      mutationFn: (payload: Partial<LandingPage>) => createEntity("landing_pages", payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Partial<LandingPage> }) =>
        updateEntity("landing_pages", id, payload),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteEntity("landing_pages", id),
      onSuccess: invalidate,
    }),
  };
}
