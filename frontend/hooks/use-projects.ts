"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createEntity, deleteEntity, getEntityById, listEntities, updateEntity } from "@/lib/supabase/adflow-repository";
import type { AdProject } from "@/lib/types/adflow";

const key = ["ad-projects"];

export function useProjects() {
  return useQuery({ queryKey: key, queryFn: () => listEntities("ad_projects") });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: [...key, projectId],
    queryFn: () => getEntityById("ad_projects", projectId),
    enabled: Boolean(projectId),
  });
}

export function useProjectMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  return {
    create: useMutation({
      mutationFn: (payload: Partial<AdProject>) => createEntity("ad_projects", payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Partial<AdProject> }) =>
        updateEntity("ad_projects", id, payload),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteEntity("ad_projects", id),
      onSuccess: invalidate,
    }),
  };
}
