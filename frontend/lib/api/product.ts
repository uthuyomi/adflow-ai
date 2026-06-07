"use client";

import { getApiBaseUrl } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Locale } from "@/lib/i18n";

async function requestWithAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Login is required.");

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export type DemandDiscoveryInsight = {
  summary: string;
  marketSignals: string[];
  competitors: string[];
  opportunity: string;
  risks: string[];
  suggestedDirection: string;
  nextActions: string[];
};

export type DemandResearchStatus =
  | "conversation"
  | "clarification_required"
  | "research_recommended"
  | "research_running"
  | "research_completed"
  | "research_failed";

export type DemandResearchCluster = {
  id?: string;
  name?: string;
  category?: string;
  demand_signal_score?: number;
  validation_score?: number;
  source_count?: number;
  representative_quotes?: string[];
};

export type DemandResearchContext = {
  run_id?: string | null;
  source_kind?: "real" | "synthetic" | "mixed" | "none";
  top_pain_clusters?: DemandResearchCluster[];
  top_desire_clusters?: DemandResearchCluster[];
  validation_summary?: Record<string, unknown>;
  competitor_gaps?: unknown[];
  opportunities?: unknown[];
  evidence?: Array<{
    title?: string;
    body?: string;
    url?: string | null;
    source_type?: string;
    source_name?: string;
    synthetic?: boolean;
  }>;
  source_status?: Record<string, unknown>;
  signal_count?: number;
  source_count?: number;
  real_signal_count?: number;
  synthetic_signal_count?: number;
};

export type DemandDiscoveryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type DemandDiscoverySession = {
  id: string;
  title: string;
  messages: DemandDiscoveryMessage[];
  insight: DemandDiscoveryInsight | null;
  latest_demand_run_id?: string | null;
  research_status: DemandResearchStatus;
  research_context: DemandResearchContext;
  research_brief: Record<string, string>;
  created_at: string;
  updated_at: string;
};

export type AssetImportSummary = {
  ads?: unknown[];
  landing_pages?: unknown[];
  pairs?: unknown[];
  errors?: Array<{ row?: number; message: string; input?: unknown }>;
  summary?: {
    ads: number;
    landing_pages: number;
    pairs: number;
    errors: number;
  };
  landing_page?: unknown;
  extracted?: unknown;
  action?: string;
  source?: string;
};

export type AdABTestVariant = {
  id: string;
  label: string;
  twitter_ad_id: string;
  metric_value: number;
  ad: {
    id: string;
    name: string;
    headline: string | null;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  } | null;
};

export type AdABTest = {
  id: string;
  project_id: string;
  name: string;
  hypothesis: string | null;
  primary_metric: "ctr" | "cvr" | "cpc";
  status: "draft" | "running" | "completed" | "archived";
  variants: AdABTestVariant[];
  provisional_winner: AdABTestVariant | null;
  note: string;
  created_at: string;
};

export type XAdsConnection = {
  id: string;
  label: string;
  status: "pending" | "active" | "invalid" | "revoked";
  last_verified_at: string | null;
  last_error: string | null;
};

export type XAdsAccount = {
  id: string;
  connection_id: string;
  x_account_id: string;
  name: string;
  currency: string | null;
  timezone: string | null;
  permissions: string[];
  promotable_users: Array<Record<string, unknown>>;
  last_synced_at: string | null;
};

export type XAdsPublishRequest = {
  id: string;
  project_id: string | null;
  source_ai_result_id: string;
  proposed_text: string;
  destination_url: string;
  hypothesis: string | null;
  approval_status: "draft" | "approved" | "rejected";
  publish_status: "not_started" | "publishing" | "published" | "failed";
  published_tweet_id: string | null;
  promoted_tweet_id: string | null;
  error_message: string | null;
  created_at: string;
};

export async function listAdABTests(projectId: string) {
  return requestWithAuth<AdABTest[]>(`/ad-optimization/projects/${projectId}/ab-tests`);
}

export async function createAdABTest(projectId: string, payload: {
  name: string;
  hypothesis?: string | null;
  primary_metric: "ctr" | "cvr" | "cpc";
  ad_ids: string[];
}) {
  return requestWithAuth<AdABTest>(`/ad-optimization/projects/${projectId}/ab-tests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdABTestStatus(testId: string, status: AdABTest["status"]) {
  return requestWithAuth<AdABTest>(`/ad-optimization/ab-tests/${testId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function importLandingPageFromUrl(payload: {
  url: string;
  project_id?: string | null;
  name?: string | null;
}) {
  return requestWithAuth<AssetImportSummary>("/asset-import/lp-from-url", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function importAdsCsv(payload: {
  csv_text: string;
  project_id?: string | null;
  auto_fetch_lps?: boolean;
  auto_pair?: boolean;
}) {
  return requestWithAuth<AssetImportSummary>("/asset-import/ads-csv", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function syncXAds(payload: {
  project_id?: string | null;
  account_id?: string | null;
  ads?: Array<Record<string, unknown>> | null;
  auto_fetch_lps?: boolean;
  auto_pair?: boolean;
}) {
  return requestWithAuth<AssetImportSummary>("/integrations/x-ads/sync", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listXAdsConnections() {
  return requestWithAuth<XAdsConnection[]>("/integrations/x-ads/connections");
}

export async function createXAdsConnection(payload: { label: string; access_token: string; access_token_secret: string }) {
  return requestWithAuth<XAdsConnection & { accounts: XAdsAccount[] }>("/integrations/x-ads/connections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyXAdsConnection(connectionId: string) {
  return requestWithAuth<XAdsConnection & { accounts: XAdsAccount[] }>(`/integrations/x-ads/connections/${connectionId}/verify`, { method: "POST" });
}

export async function revokeXAdsConnection(connectionId: string) {
  return requestWithAuth<XAdsConnection>(`/integrations/x-ads/connections/${connectionId}/revoke`, { method: "POST" });
}

export async function listXAdsAccounts(connectionId?: string) {
  return requestWithAuth<XAdsAccount[]>(`/integrations/x-ads/accounts${connectionId ? `?connection_id=${encodeURIComponent(connectionId)}` : ""}`);
}

export async function detailedSyncXAds(payload: { connection_id: string; account_id: string; project_id?: string | null; days?: number }) {
  return requestWithAuth<{ ads: unknown[]; account_id: string; synced_count: number; days: number }>("/integrations/x-ads/detailed-sync", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listXAdsPublishRequests(projectId?: string) {
  return requestWithAuth<XAdsPublishRequest[]>(`/integrations/x-ads/publish-requests${projectId ? `?project_id=${encodeURIComponent(projectId)}` : ""}`);
}

export async function createXAdsPublishRequest(payload: {
  source_ai_result_id: string;
  connection_id: string;
  account_id: string;
  line_item_id: string;
  proposed_text: string;
  hypothesis?: string | null;
  primary_metric?: "ctr" | "cvr" | "cpc";
}) {
  return requestWithAuth<XAdsPublishRequest>("/integrations/x-ads/publish-requests", { method: "POST", body: JSON.stringify(payload) });
}

export async function approveXAdsPublishRequest(requestId: string, approved: boolean) {
  return requestWithAuth<XAdsPublishRequest>(`/integrations/x-ads/publish-requests/${requestId}/approval`, {
    method: "POST",
    body: JSON.stringify({ approved }),
  });
}

export async function publishXAdsRequest(requestId: string) {
  return requestWithAuth<XAdsPublishRequest>(`/integrations/x-ads/publish-requests/${requestId}/publish`, { method: "POST" });
}

export async function analyzeDemandDiscovery(input: string, locale: Locale = "ja", signal?: AbortSignal) {
  return requestWithAuth<{ insight: DemandDiscoveryInsight; assistant_message: string }>(
    "/demand-discovery/analyze",
    {
      method: "POST",
      body: JSON.stringify({ input, locale }),
      signal,
    },
  );
}

export async function createDemandDiscoverySession(input: string, locale: Locale = "ja", signal?: AbortSignal) {
  return requestWithAuth<DemandDiscoverySession>("/demand-discovery/sessions", {
    method: "POST",
    body: JSON.stringify({ input, locale }),
    signal,
  });
}

export async function sendDemandDiscoveryMessage(sessionId: string, input: string, locale: Locale = "ja", signal?: AbortSignal) {
  return requestWithAuth<DemandDiscoverySession>(`/demand-discovery/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ input, locale }),
    signal,
  });
}

export async function runDemandDiscoveryResearch(
  sessionId: string,
  payload: { locale?: Locale; force?: boolean; source_urls?: string[] } = {},
  signal?: AbortSignal,
) {
  return requestWithAuth<{ session: DemandDiscoverySession; reused: boolean; credits_consumed: number }>(
    `/demand-discovery/sessions/${sessionId}/research`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      signal,
    },
  );
}
