import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { DiffResultSchema, Improvement, ReviewResultSchema } from "@/lib/schemas";
import type { AnalysisRun } from "@/lib/types/adflow";
import type { z } from "zod";

export async function getImprovements(): Promise<Improvement[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("analysis_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as AnalysisRun[]).flatMap(runToImprovements);
}

export async function getImprovementDetail(improvementId: string) {
  const improvements = await getImprovements();
  return improvements.find((item) => item.id === improvementId) ?? null;
}

export async function approveImprovement(improvementId: string) {
  return { improvementId, status: "Approved" as const };
}

export async function createPullRequest(improvementId: string) {
  return { improvementId, pr: null };
}

function runToImprovements(run: AnalysisRun): Improvement[] {
  const ad = (run.ad_improvements ?? {}) as Record<string, unknown>;
  const lp = (run.lp_improvements ?? {}) as Record<string, unknown>;
  const review = normalizeReview(run.review_result as Record<string, unknown> | null);
  const diff = normalizeDiff(run.diff_plan as Record<string, unknown> | null);
  const problems = arrayOfStrings(ad.problems);
  const suggestions = arrayOfStrings(ad.suggestions);
  const lpSuggestions = [
    ...arrayOfStrings(lp.hero),
    ...arrayOfStrings(lp.cta),
    ...arrayOfStrings(lp.structure),
    ...arrayOfStrings(lp.mobile_ui),
  ];
  if (!problems.length && !suggestions.length && !lpSuggestions.length) return [];
  const items = problems.length ? problems : suggestions.length ? suggestions : lpSuggestions;
  return items.map((problem, index) => ({
    id: `${run.id}-${index}`,
    problem,
    adSuggestions: suggestions,
    lpSuggestions,
    confidence: Number(run.score ?? 0),
    expectedCtrImpact: 0,
    expectedCvrImpact: 0,
    riskLevel: riskLevel(run.risk_level),
    reviewStatus: "Pending",
    diff,
    review,
    campaignId: run.ad_lp_pair_id,
  }));
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function riskLevel(value: string | null): Improvement["riskLevel"] {
  if (value === "high") return "High";
  if (value === "medium") return "Medium";
  return "Low";
}

function normalizeDiff(value: Record<string, unknown> | null): z.infer<typeof DiffResultSchema> {
  return {
    files: Array.isArray(value?.files) ? value.files as z.infer<typeof DiffResultSchema>["files"] : [],
  };
}

function normalizeReview(value: Record<string, unknown> | null): z.infer<typeof ReviewResultSchema> {
  return {
    exaggerated_claims: arrayOfStrings(value?.exaggerated_claims),
    brand_risks: arrayOfStrings(value?.brand_risks),
    ui_risks: arrayOfStrings(value?.ui_risks),
    dangerous_changes: arrayOfStrings(value?.dangerous_changes),
    approved_for_pr: Boolean(value?.approved_for_pr),
  };
}
