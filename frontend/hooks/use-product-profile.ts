"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getProductProfile, upsertProductProfile } from "@/lib/api/client";

export function useProductProfile(projectId: string | undefined | null) {
  return useQuery({
    queryKey: ["product-profile", projectId],
    queryFn: () => getProductProfile(projectId ?? ""),
    enabled: Boolean(projectId),
    retry: false,
  });
}

export function useUpsertProductProfile(projectId: string | undefined | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertProductProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-profile", projectId] });
    },
  });
}
