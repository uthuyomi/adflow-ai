"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSavedView, deleteNotification, deleteSavedView, getOperationsDashboard, getWorkspaceSettings, listActivity, listJobs, listNotifications, listSavedViews, markNotification,
  retryJob, searchWorkspace, updateWorkspaceSettings,
} from "@/lib/api/operations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function useOperationsRealtime() {
  const client = useQueryClient();
  useEffect(() => {
    const channel = getSupabaseBrowserClient()
      .channel("operations-workspace")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_notifications" }, () => client.invalidateQueries({ queryKey: ["operations"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "background_jobs" }, () => client.invalidateQueries({ queryKey: ["operations"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_events" }, () => client.invalidateQueries({ queryKey: ["operations"] }))
      .subscribe();
    return () => { void getSupabaseBrowserClient().removeChannel(channel); };
  }, [client]);
}

export const useGlobalSearch = (query: string) => useQuery({ queryKey: ["operations", "search", query], queryFn: () => searchWorkspace(query), enabled: query.trim().length >= 2, staleTime: 30_000 });
export const useNotifications = () => useQuery({ queryKey: ["operations", "notifications"], queryFn: listNotifications, staleTime: 10_000, refetchInterval: 10_000 });
export const useActivity = (projectId?: string) => useQuery({ queryKey: ["operations", "activity", projectId], queryFn: () => listActivity(projectId), staleTime: 10_000, refetchInterval: 10_000 });
export const useJobs = () => useQuery({ queryKey: ["operations", "jobs"], queryFn: listJobs, staleTime: 10_000, refetchInterval: 10_000 });
export const useOperationsDashboard = () => useQuery({ queryKey: ["operations", "dashboard"], queryFn: getOperationsDashboard, staleTime: 10_000, refetchInterval: 10_000 });
export const useWorkspaceSettings = () => useQuery({ queryKey: ["operations", "settings"], queryFn: getWorkspaceSettings });
export const useSavedViews = () => useQuery({ queryKey: ["operations", "saved-views"], queryFn: listSavedViews });

export function useOperationsMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: ["operations"] });
  return {
    markNotification: useMutation({ mutationFn: ({ id, read = true }: { id: string; read?: boolean }) => markNotification(id, read), onSuccess: invalidate }),
    deleteNotification: useMutation({ mutationFn: deleteNotification, onSuccess: invalidate }),
    updateSettings: useMutation({ mutationFn: updateWorkspaceSettings, onSuccess: invalidate }),
    retryJob: useMutation({ mutationFn: retryJob, onSuccess: invalidate }),
    createSavedView: useMutation({ mutationFn: createSavedView, onSuccess: invalidate }),
    deleteSavedView: useMutation({ mutationFn: deleteSavedView, onSuccess: invalidate }),
  };
}
