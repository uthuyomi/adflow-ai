"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveXAdsPublishRequest,
  createXAdsConnection,
  createXAdsPublishRequest,
  detailedSyncXAds,
  listXAdsAccounts,
  listXAdsConnections,
  listXAdsPublishRequests,
  publishXAdsRequest,
  revokeXAdsConnection,
  startXAdsOAuth,
  verifyXAdsConnection,
} from "@/lib/api/product";

export function useXAdsConnections() {
  return useQuery({ queryKey: ["x-ads-connections"], queryFn: listXAdsConnections });
}

export function useXAdsAccounts() {
  return useQuery({ queryKey: ["x-ads-accounts"], queryFn: () => listXAdsAccounts() });
}

export function useXAdsPublishRequests(projectId?: string) {
  return useQuery({ queryKey: ["x-ads-publish-requests", projectId], queryFn: () => listXAdsPublishRequests(projectId) });
}

export function useXAdsMutations(projectId?: string) {
  const client = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["x-ads-connections"] }),
      client.invalidateQueries({ queryKey: ["x-ads-accounts"] }),
      client.invalidateQueries({ queryKey: ["x-ads-publish-requests"] }),
      client.invalidateQueries({ queryKey: ["twitter-ads"] }),
      client.invalidateQueries({ queryKey: ["ad-ab-tests"] }),
      client.invalidateQueries({ queryKey: ["outcomes-dashboard"] }),
    ]);
  };
  return {
    startOAuth: useMutation({ mutationFn: startXAdsOAuth }),
    connect: useMutation({ mutationFn: createXAdsConnection, onSuccess: refresh }),
    verify: useMutation({ mutationFn: verifyXAdsConnection, onSuccess: refresh }),
    revoke: useMutation({ mutationFn: revokeXAdsConnection, onSuccess: refresh }),
    sync: useMutation({
      mutationFn: (payload: { connection_id: string; account_id: string; days?: number }) => detailedSyncXAds({ ...payload, project_id: projectId }),
      onSuccess: refresh,
    }),
    createPublishRequest: useMutation({ mutationFn: createXAdsPublishRequest, onSuccess: refresh }),
    approve: useMutation({ mutationFn: ({ requestId, approved }: { requestId: string; approved: boolean }) => approveXAdsPublishRequest(requestId, approved), onSuccess: refresh }),
    publish: useMutation({ mutationFn: publishXAdsRequest, onSuccess: refresh }),
  };
}
