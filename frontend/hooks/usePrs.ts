import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/hooks/useAdflowData";
import { createGitHubPullRequest, getPullRequests, syncAllGitHubPullRequests, syncGitHubPullRequest } from "@/lib/api/prs";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function usePrs() {
  return useQuery({
    queryKey: queryKeys.prs,
    queryFn: async () => {
      await syncAllGitHubPullRequests().catch(() => []);
      return getPullRequests();
    },
    refetchInterval: 60_000,
  });
}

export function useCreateGitHubPr() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ improvementId, selectionId }: { improvementId: string; selectionId: string }) => createGitHubPullRequest(improvementId, selectionId), onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.prs }) });
}

export function useSyncGitHubPr() {
  const client = useQueryClient();
  return useMutation({ mutationFn: syncGitHubPullRequest, onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.prs }) });
}
