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
