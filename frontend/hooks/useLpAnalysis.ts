import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/hooks/useAdflowData";
import { getLpAnalysis } from "@/lib/api/lp";

export function useLpAnalysis() {
  return useQuery({
    queryKey: queryKeys.lp,
    queryFn: getLpAnalysis,
  });
}
