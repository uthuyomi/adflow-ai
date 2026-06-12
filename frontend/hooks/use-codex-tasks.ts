"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelCodexTask, createCodexOutcome, createCodexPr, executeCodexManual, executeCodexReal, getCodexConfiguration, getCodexTask, listCodexTasks } from "@/lib/api/codex";

export const useCodexTasks = (query = "") => useQuery({ queryKey: ["codex-tasks", query], queryFn: () => listCodexTasks(query) });
export const useCodexTask = (id: string) => useQuery({ queryKey: ["codex-task", id], queryFn: () => getCodexTask(id), enabled: Boolean(id), refetchInterval: 5000 });
export const useCodexConfiguration = () => useQuery({ queryKey: ["codex-configuration"], queryFn: getCodexConfiguration });
export function useCodexActions(id: string) {
  const client = useQueryClient();
  const refresh = () => { client.invalidateQueries({ queryKey: ["codex-task", id] }); client.invalidateQueries({ queryKey: ["codex-tasks"] }); };
  return {
    manual: useMutation({ mutationFn: (payload: Record<string, unknown>) => executeCodexManual(id, payload), onSuccess: refresh }),
    real: useMutation({ mutationFn: () => executeCodexReal(id), onSuccess: refresh }),
    cancel: useMutation({ mutationFn: () => cancelCodexTask(id), onSuccess: refresh }),
    pr: useMutation({ mutationFn: ({ executionId, selectionId }: { executionId: string; selectionId: string }) => createCodexPr(id, executionId, selectionId), onSuccess: refresh }),
    outcome: useMutation({ mutationFn: () => createCodexOutcome(id), onSuccess: refresh }),
  };
}
