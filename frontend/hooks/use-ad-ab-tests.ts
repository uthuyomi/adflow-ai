"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createAdABTest, listAdABTests, updateAdABTestStatus, type AdABTest } from "@/lib/api/product";

export function useAdABTests(projectId: string) {
  return useQuery({
    queryKey: ["ad-ab-tests", projectId],
    queryFn: () => listAdABTests(projectId),
    enabled: Boolean(projectId),
  });
}

export function useAdABTestMutations(projectId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ad-ab-tests", projectId] });
  return {
    create: useMutation({
      mutationFn: (payload: {
        name: string;
        hypothesis?: string | null;
        primary_metric: "ctr" | "cvr" | "cpc";
        ad_ids: string[];
      }) => createAdABTest(projectId, payload),
      onSuccess: invalidate,
    }),
    updateStatus: useMutation({
      mutationFn: ({ testId, status }: { testId: string; status: AdABTest["status"] }) =>
        updateAdABTestStatus(testId, status),
      onSuccess: invalidate,
    }),
  };
}
