import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/hooks/useAdflowData";
import { getPullRequests } from "@/lib/api/prs";

export function usePrs() {
  return useQuery({
    queryKey: queryKeys.prs,
    queryFn: getPullRequests,
  });
}
