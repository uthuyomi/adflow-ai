"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createWorkspaceProject, duplicateWorkspaceProject, listWorkspaceProjects, updateWorkspaceProject } from "@/lib/api/operations";
import { getEntityById } from "@/lib/supabase/adflow-repository";
import type { AdProject } from "@/lib/types/adflow";

const key = ["ad-projects"];

export function useProjects() {
  return useQuery({ queryKey: key, queryFn: () => listWorkspaceProjects() });
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
      mutationFn: (payload: Partial<AdProject>) => createWorkspaceProject({ name: payload.name ?? "", description: payload.description }),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Partial<AdProject> }) =>
        updateWorkspaceProject(id, payload),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => updateWorkspaceProject(id, { status: "DELETED" }),
      onSuccess: invalidate,
    }),
    duplicate: useMutation({
      mutationFn: (id: string) => duplicateWorkspaceProject(id),
      onSuccess: invalidate,
    }),
  };
}
