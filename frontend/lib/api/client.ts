import { fallbackWorkflow } from "@/lib/mock-data";
import { WorkflowResultSchema, type WorkflowResult } from "@/lib/schemas";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  CodexTaskPrompt,
  EvidenceCluster,
  EvidenceSource,
  JsonRecord,
  IntelligenceAlert,
  IdeaBacklogItem,
  IdeaCompareResult,
  IdeaDiscoveryResult,
  IdeaMessage,
  IdeaMonitoringRun,
  IdeaReviewRun,
  IdeaRoadmap,
  IdeaSession,
  LearningPattern,
  MonitoringRun,
  ProductBacklogItem,
  ProductProfile,
  ProductRoadmap,
  ProductReviewRequest,
  ProductReviewRun,
} from "@/lib/types/adflow";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
}

function legacyWorkflowEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_LEGACY_WORKFLOW === "true";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(await response.text(), response.status);
  }

  return response.json() as Promise<T>;
}

export async function requestWithAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Login is required.");
  return request<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
}

export async function runWorkflow(): Promise<WorkflowResult> {
  if (!legacyWorkflowEnabled()) {
    return fallbackWorkflow;
  }
  try {
    const payload = await request<unknown>("/workflow/run", { method: "POST" });
    return WorkflowResultSchema.parse(payload);
  } catch (error) {
    console.warn("Legacy workflow request failed. Falling back to local demo data.", error);
    return fallbackWorkflow;
  }
}

export function collectEvidence(payload: {
  project_id: string;
  ad_lp_pair_id?: string | null;
  product_review_run_id?: string | null;
  market_research_run_id?: string | null;
  query: string;
  sources?: string[];
  max_items?: number;
  language?: string;
  region?: string;
  manual_items?: JsonRecord[];
}) {
  return requestWithAuth<{
    status: string;
    evidence_count: number;
    embedding_count: number;
    cluster_count: number;
    sources: EvidenceSource[];
    clusters: EvidenceCluster[];
  }>("/evidence/collect", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listEvidenceByProject(projectId: string) {
  return requestWithAuth<EvidenceSource[]>(`/evidence/projects/${projectId}`);
}

export function listEvidenceByPair(pairId: string) {
  return requestWithAuth<EvidenceSource[]>(`/evidence/pairs/${pairId}`);
}

export function listEvidenceClusters(projectId: string, pairId?: string | null) {
  const suffix = pairId ? `?pair_id=${pairId}` : "";
  return requestWithAuth<EvidenceCluster[]>(`/evidence/projects/${projectId}/clusters${suffix}`);
}

export function searchEvidence(payload: {
  project_id?: string | null;
  ad_lp_pair_id?: string | null;
  query: string;
  limit?: number;
}) {
  return requestWithAuth<{ query: string; results: EvidenceSource[] }>("/evidence/search", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getProductProfile(projectId: string) {
  return requestWithAuth<ProductProfile | null>(`/product-profile/projects/${projectId}`);
}

export function upsertProductProfile(payload: {
  project_id: string;
  product_name: string;
  product_url?: string | null;
  short_description?: string | null;
  target_users?: string | null;
  core_value?: string | null;
  current_features?: string[];
  pricing_model?: string | null;
  current_stage?: string | null;
  positioning_notes?: string | null;
  known_constraints?: string | null;
  do_not_build?: string[];
}) {
  return requestWithAuth<ProductProfile>("/product-profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function runProductReview(payload: ProductReviewRequest) {
  return requestWithAuth<{
    run_id: string;
    status: string;
    product_opportunity_score: number | null;
    backlog_count: number;
    run: ProductReviewRun;
  }>("/product-review/run", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listProductReviewRuns(projectId: string) {
  return requestWithAuth<ProductReviewRun[]>(`/product-review/projects/${projectId}/runs`);
}

export function getLatestProductReview(projectId: string, pairId?: string | null) {
  const suffix = pairId ? `?pair_id=${pairId}` : "";
  return requestWithAuth<ProductReviewRun>(`/product-review/projects/${projectId}/latest${suffix}`);
}

export function listProductBacklog(projectId: string) {
  return requestWithAuth<ProductBacklogItem[]>(`/product-backlog/projects/${projectId}`);
}

export function updateProductBacklogItem(itemId: string, payload: Partial<ProductBacklogItem>) {
  return requestWithAuth<ProductBacklogItem>(`/product-backlog/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function decideProductBacklogItem(itemId: string, payload: { status: string; reason?: string | null }) {
  return requestWithAuth<ProductBacklogItem>(`/product-backlog/${itemId}/decision`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function convertProductBacklogToCodexTask(itemId: string) {
  return requestWithAuth<CodexTaskPrompt>(`/product-backlog/${itemId}/codex-task`, {
    method: "POST",
  });
}

export function generateRoadmap(projectId: string, payload?: { product_review_run_id?: string | null; title?: string | null }) {
  return requestWithAuth<ProductRoadmap>(`/roadmap/projects/${projectId}/generate`, {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export function getLatestRoadmap(projectId: string) {
  return requestWithAuth<ProductRoadmap>(`/roadmap/projects/${projectId}/latest`);
}

export function listRoadmaps(projectId: string) {
  return requestWithAuth<ProductRoadmap[]>(`/roadmap/projects/${projectId}`);
}

export function runMonitoring(payload: {
  project_id: string;
  ad_lp_pair_id?: string | null;
  query: string;
  monitoring_type?: string;
  max_evidence_items?: number;
}) {
  return requestWithAuth<MonitoringRun & { alert_records?: IntelligenceAlert[] }>("/monitoring/run", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listMonitoringRuns(projectId: string) {
  return requestWithAuth<MonitoringRun[]>(`/monitoring/projects/${projectId}/runs`);
}

export function listIntelligenceAlerts(projectId: string, status?: string | null) {
  const suffix = status ? `?status=${status}` : "";
  return requestWithAuth<IntelligenceAlert[]>(`/monitoring/projects/${projectId}/alerts${suffix}`);
}

export function updateIntelligenceAlert(alertId: string, payload: { status?: string; severity?: string; metadata?: JsonRecord }) {
  return requestWithAuth<IntelligenceAlert>(`/monitoring/alerts/${alertId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function refreshLearningPatterns(projectId: string) {
  return requestWithAuth<{ project_id: string; pattern_count: number; patterns: LearningPattern[] }>(
    `/learning/projects/${projectId}/refresh`,
    { method: "POST" },
  );
}

export function listLearningPatterns(projectId: string) {
  return requestWithAuth<LearningPattern[]>(`/learning/projects/${projectId}/patterns`);
}

export function createIdeaSession(payload: { title?: string | null; project_id?: string | null; initial_message?: string | null }) {
  return requestWithAuth<IdeaSession>("/idea-lab/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listIdeaSessions() {
  return requestWithAuth<IdeaSession[]>("/idea-lab/sessions");
}

export function getIdeaSession(sessionId: string) {
  return requestWithAuth<IdeaSession>(`/idea-lab/sessions/${sessionId}`);
}

export function sendIdeaChat(payload: { session_id?: string | null; message: string }) {
  return requestWithAuth<{ session: IdeaSession; message: IdeaMessage }>("/idea-lab/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listIdeaMessages(sessionId: string) {
  return requestWithAuth<IdeaMessage[]>(`/idea-lab/messages/${sessionId}`);
}

export function runIdeaReview(payload: { session_id: string; max_evidence_items?: number }) {
  return requestWithAuth<IdeaReviewRun & { backlog_items?: IdeaBacklogItem[]; roadmap?: IdeaRoadmap }>("/idea-lab/review", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getIdeaReview(sessionId: string) {
  return requestWithAuth<IdeaReviewRun>(`/idea-lab/review/${sessionId}`);
}

export function discoverIdeas(payload: { query: string; max_items?: number }) {
  return requestWithAuth<IdeaDiscoveryResult>("/idea-lab/discover", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function compareIdeas(payload: { ideas: Array<Record<string, unknown>> }) {
  return requestWithAuth<IdeaCompareResult>("/idea-lab/compare", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listIdeaBacklog(sessionId: string) {
  return requestWithAuth<IdeaBacklogItem[]>(`/idea-lab/backlog/${sessionId}`);
}

export function getIdeaRoadmap(sessionId: string) {
  return requestWithAuth<IdeaRoadmap>(`/idea-lab/roadmap/${sessionId}`);
}

export function runIdeaMonitoring(payload: { session_id: string; query?: string | null; monitoring_type?: string; max_evidence_items?: number }) {
  return requestWithAuth<IdeaMonitoringRun>("/idea-lab/monitoring/run", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listIdeaMonitoring(sessionId: string) {
  return requestWithAuth<IdeaMonitoringRun[]>(`/idea-lab/monitoring/${sessionId}`);
}

export function convertIdeaToProduct(payload: { session_id: string; project_id?: string | null; product_name?: string | null }) {
  return requestWithAuth<{ project_id: string; product_profile: ProductProfile; next_step: string }>("/idea-lab/convert-to-product", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
