"use client";

import { getApiBaseUrl } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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

export type DemandDiscoveryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type DemandDiscoverySession = {
  id: string;
  title: string;
  messages: DemandDiscoveryMessage[];
  insight: DemandDiscoveryInsight | null;
  created_at: string;
  updated_at: string;
};

export async function analyzeDemandDiscovery(input: string) {
  return requestWithAuth<{ insight: DemandDiscoveryInsight; assistant_message: string }>(
    "/demand-discovery/analyze",
    {
      method: "POST",
      body: JSON.stringify({ input }),
    },
  );
}

export async function createDemandDiscoverySession(input: string) {
  return requestWithAuth<DemandDiscoverySession>("/demand-discovery/sessions", {
    method: "POST",
    body: JSON.stringify({ input }),
  });
}

export async function sendDemandDiscoveryMessage(sessionId: string, input: string) {
  return requestWithAuth<DemandDiscoverySession>(`/demand-discovery/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ input }),
  });
}
