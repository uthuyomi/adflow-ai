"use client";

import { getApiBaseUrl } from "@/lib/api/client";
import type { Improvement } from "@/lib/schemas";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  AIAgentResult,
  ImprovementStats,
  ImprovementStatus,
  ImprovementStatusHistory,
  JsonRecord,
} from "@/lib/types/adflow";

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

export async function getImprovements(): Promise<Improvement[]> {
  const results = await requestWithAuth<AIAgentResult[]>("/improvements?limit=500");
  return results.map(resultToImprovement);
}

export async function getImprovementDetail(improvementId: string): Promise<Improvement> {
  return resultToImprovement(await requestWithAuth<AIAgentResult>(`/improvements/${improvementId}`));
}

export async function getImprovementHistory(improvementId: string) {
  return requestWithAuth<ImprovementStatusHistory[]>(`/improvements/${improvementId}/history`);
}

export async function getImprovementStats() {
  return requestWithAuth<ImprovementStats>("/improvements/stats");
}

export async function transitionImprovement({
  improvementId,
  newStatus,
  reason,
}: {
  improvementId: string;
  newStatus: ImprovementStatus;
  reason?: string;
}) {
  return requestWithAuth<AIAgentResult>(`/improvements/${improvementId}/transition`, {
    method: "POST",
    body: JSON.stringify({ new_status: newStatus, reason }),
  });
}

function resultToImprovement(result: AIAgentResult): Improvement {
  const output = result.output ?? {};
  const predicted = result.predicted_effect ?? {};
  const recommendations = arrayOfStrings(output.recommendations);
  const rationale = arrayOfStrings(output.rationale);
  const summary = stringValue(output.summary) || rationale[0] || result.task;
  return {
    id: result.id,
    problem: summary,
    adSuggestions: recommendations,
    lpSuggestions: rationale,
    confidence: Number(result.confidence ?? result.score ?? 0),
    expectedCtrImpact: numberValue(predicted, "ctr_lift"),
    expectedCvrImpact: numberValue(predicted, "cvr_lift"),
    riskLevel: riskLevel(result.risk_level),
    reviewStatus: result.decision_status,
    providerType: result.provider_type,
    sourceProvider: result.source_provider,
    decisionReason: result.decision_reason,
    statusUpdatedAt: result.status_updated_at || result.decided_at || result.created_at,
    diff: { files: [] },
    review: {
      exaggerated_claims: [],
      brand_risks: arrayOfStrings(output.risk_flags),
      ui_risks: [],
      dangerous_changes: [],
      approved_for_pr: result.decision_status === "APPLY_READY" || result.decision_status === "APPLIED",
    },
    campaignId: result.ad_lp_pair_id ?? "",
  };
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: JsonRecord, key: string) {
  return typeof value[key] === "number" ? value[key] : 0;
}

function riskLevel(value: string | null): Improvement["riskLevel"] {
  if (value?.toLowerCase() === "high") return "High";
  if (value?.toLowerCase() === "medium") return "Medium";
  return "Low";
}
