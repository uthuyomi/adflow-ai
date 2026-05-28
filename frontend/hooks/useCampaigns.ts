import { useQuery } from "@tanstack/react-query";

import { getCampaignDetail, getCampaigns } from "@/lib/api/campaigns";
import { queryKeys } from "@/hooks/useAdflowData";

export function useCampaigns() {
  return useQuery({
    queryKey: queryKeys.campaigns,
    queryFn: getCampaigns,
  });
}

export function useCampaign(campaignId: string) {
  return useQuery({
    queryKey: queryKeys.campaign(campaignId),
    queryFn: () => getCampaignDetail(campaignId),
    enabled: Boolean(campaignId),
  });
}
