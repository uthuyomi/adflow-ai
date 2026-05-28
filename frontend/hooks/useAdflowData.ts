import { useQuery } from "@tanstack/react-query";

import { runWorkflow } from "@/lib/api/client";

export const queryKeys = {
  workflow: ["workflow"] as const,
  campaigns: ["campaigns"] as const,
  campaign: (id: string) => ["campaign", id] as const,
  lp: ["lp-analysis"] as const,
  improvements: ["improvements"] as const,
  improvement: (id: string) => ["improvement", id] as const,
  prs: ["pull-requests"] as const,
};

export function useWorkflow() {
  return useQuery({
    queryKey: queryKeys.workflow,
    queryFn: runWorkflow,
    staleTime: 60_000,
    retry: 1,
  });
}
