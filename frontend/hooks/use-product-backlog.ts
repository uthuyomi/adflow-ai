"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { convertProductBacklogToCodexTask, decideProductBacklogItem, listProductBacklog, updateProductBacklogItem } from "@/lib/api/client";

export function useProductBacklog(projectId: string | undefined | null) {
  return useQuery({
    queryKey: ["product-backlog", projectId],
    queryFn: () => listProductBacklog(projectId ?? ""),
    enabled: Boolean(projectId),
  });
}

export function useDecideProductBacklogItem(projectId: string | undefined | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, status, reason }: { itemId: string; status: string; reason?: string | null }) =>
      decideProductBacklogItem(itemId, { status, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-backlog", projectId] });
    },
  });
}

export function useUpdateProductBacklogItem(projectId: string | undefined | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: Parameters<typeof updateProductBacklogItem>[1] }) =>
      updateProductBacklogItem(itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-backlog", projectId] });
    },
  });
}

export function useConvertProductBacklogToCodexTask(projectId: string | undefined | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: convertProductBacklogToCodexTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-backlog", projectId] });
    },
  });
}
