"use client";

import { requestWithAuth } from "@/lib/api/authenticated";

export type ExperimentStatus = "DRAFT" | "READY" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "ARCHIVED";
export type Experiment = {
  id: string;
  project_id: string;
  name: string;
  hypothesis: string | null;
  primary_metric: string;
  status: ExperimentStatus;
  minimum_sample_size: number;
  confidence_threshold: number;
  created_at: string;
  variants: Array<{ id: string; name: string; label: string; allocation: number; status: string; measurements: Array<Record<string, unknown>> }>;
  latest_evaluation: null | { status: string; reason: string; improvement_rate: number; confidence_score: number; winner_variant_id: string | null };
  history: Array<Record<string, unknown>>;
};

export type ExperimentDashboard = {
  active_experiments: number;
  completed_experiments: number;
  winning_variants: number;
  failing_variants: number;
  success_rate: number;
  average_improvement_rate: number;
  total_revenue_impact: number;
  learning_insights: number;
  recent_insights: Array<{ id: string; title: string; summary: string; created_at: string }>;
};

export function listExperiments(filters: { project_id?: string; status?: string } = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as string[][]);
  return requestWithAuth<Experiment[]>(`/experiments?${query}`);
}
export function getExperiment(id: string) { return requestWithAuth<Experiment>(`/experiments/${id}`); }
export function getExperimentDashboard() { return requestWithAuth<ExperimentDashboard>("/experiments/dashboard"); }
export function transitionExperiment(id: string, status: ExperimentStatus, reason?: string) {
  return requestWithAuth<Experiment>(`/ad-optimization/ab-tests/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, reason }) });
}
export function collectExperiment(id: string) {
  return requestWithAuth<Record<string, unknown>>(`/experiments/${id}/measurements/collect`, { method: "POST" });
}
export function evaluateExperiment(id: string, complete = false) {
  return requestWithAuth<Experiment>(`/experiments/${id}/evaluate?complete=${complete}`, { method: "POST" });
}
