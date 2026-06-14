import { requestWithAuth } from "@/lib/api/authenticated";
import type { ImprovementOutcome, ImprovementOutcomeStatus, JsonRecord, OutcomeDetail, OutcomeStats } from "@/lib/types/adflow";

export type OutcomeFilters = { project_id?: string; status?: ImprovementOutcomeStatus | ""; search?: string; sort?: string; date_from?: string; date_to?: string };

export function listOutcomes(filters: OutcomeFilters = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as string[][]);
  return requestWithAuth<ImprovementOutcome[]>(`/outcomes?${query}`);
}
export function getOutcome(id: string) { return requestWithAuth<OutcomeDetail>(`/outcomes/${id}`); }
export function getOutcomeStats() { return requestWithAuth<OutcomeStats>("/outcomes/stats"); }
export function measureOutcome(id: string, payload: { before_metrics: JsonRecord; after_metrics: JsonRecord; measurement_method: string; measurement_source?: string; evidence_data?: JsonRecord[]; evaluation_thresholds?: JsonRecord; measurement_period?: JsonRecord }) {
  return requestWithAuth<ImprovementOutcome>(`/outcomes/${id}/measure`, { method: "POST", body: JSON.stringify(payload) });
}
export function transitionOutcome(id: string, status: ImprovementOutcomeStatus, reason: string) {
  return requestWithAuth<ImprovementOutcome>(`/outcomes/${id}/transition`, { method: "POST", body: JSON.stringify({ status, reason }) });
}
export function refreshOutcome(id: string, connector_key: string) {
  return requestWithAuth<ImprovementOutcome>(`/outcomes/${id}/refresh`, { method: "POST", body: JSON.stringify({ connector_key }) });
}
