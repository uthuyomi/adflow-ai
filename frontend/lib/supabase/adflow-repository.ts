"use client";

import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  AdLpPair,
  AdProject,
  AnalysisRun,
  ChangeHistory,
  EntityName,
  JsonRecord,
  LandingPageVersion,
  LandingPage,
  ImprovementOutcome,
  MarketResearchRun,
  ProductBacklogItem,
  ProductReviewRun,
  EvidenceCluster,
  IntelligenceAlert,
  LearningPattern,
  ProductRoadmap,
  TwitterAd,
} from "@/lib/types/adflow";

export type EntityMap = {
  ad_projects: AdProject;
  twitter_ads: TwitterAd;
  landing_pages: LandingPage;
  ad_lp_pairs: AdLpPair;
};

async function safeDashboardList<T>(loader: () => Promise<T[]>): Promise<T[]> {
  try {
    return await loader();
  } catch (error) {
    console.warn("Dashboard Supabase query failed. Returning empty data.", error);
    return [];
  }
}

const entityLabels: Record<EntityName, string> = {
  ad_projects: "ad_project",
  twitter_ads: "twitter_ad",
  landing_pages: "landing_page",
  ad_lp_pairs: "ad_lp_pair",
};

export async function getCurrentUser(): Promise<User> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Login is required.");
  return data.user;
}

export async function listEntities<TName extends EntityName>(
  table: TName,
  select = "*",
): Promise<EntityMap[TName][]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as EntityMap[TName][];
}

export async function getEntityById<TName extends EntityName>(
  table: TName,
  id: string,
  select = "*",
): Promise<EntityMap[TName]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from(table).select(select).eq("id", id).single();
  if (error) throw error;
  return data as unknown as EntityMap[TName];
}

export async function createEntity<TName extends EntityName>(
  table: TName,
  payload: Partial<EntityMap[TName]>,
  options?: { summary?: string; reason?: string },
): Promise<EntityMap[TName]> {
  const user = await getCurrentUser();
  const supabase = getSupabaseBrowserClient();
  const insertPayload = { ...payload, user_id: user.id };
  const { data, error } = await supabase.from(table).insert(insertPayload as never).select("*").single();
  if (error) throw error;
  const history = await insertHistory({
    userId: user.id,
    entityType: entityLabels[table],
    entityId: data.id,
    projectId: projectIdOf(data),
    action: "create",
    beforeData: null,
    afterData: data as JsonRecord,
    summary: options?.summary ?? buildSummary("create", entityLabels[table], data),
    reason: options?.reason,
  });
  if (table === "landing_pages") {
    await insertLandingPageVersion(data as LandingPage, 1, history.id, "Initial LP version");
  }
  return data as unknown as EntityMap[TName];
}

export async function updateEntity<TName extends EntityName>(
  table: TName,
  id: string,
  payload: Partial<EntityMap[TName]>,
  options?: { summary?: string; reason?: string },
): Promise<EntityMap[TName]> {
  const user = await getCurrentUser();
  const before = await getEntityById(table, id);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from(table)
    .update(payload as never)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) throw error;
  const history = await insertHistory({
    userId: user.id,
    entityType: entityLabels[table],
    entityId: id,
    projectId: projectIdOf(data) ?? projectIdOf(before),
    action: "update",
    beforeData: before as JsonRecord,
    afterData: data as JsonRecord,
    summary: options?.summary ?? buildSummary("update", entityLabels[table], data),
    reason: options?.reason,
  });
  if (table === "landing_pages") {
    const versionNumber = await nextLandingPageVersion(id);
    await insertLandingPageVersion(
      data as LandingPage,
      versionNumber,
      history.id,
      options?.summary ?? buildSummary("update", entityLabels[table], data),
    );
  }
  return data as unknown as EntityMap[TName];
}

export async function deleteEntity<TName extends EntityName>(
  table: TName,
  id: string,
  options?: { summary?: string; reason?: string },
) {
  const user = await getCurrentUser();
  const before = await getEntityById(table, id);
  await insertHistory({
    userId: user.id,
    entityType: entityLabels[table],
    entityId: id,
    projectId: projectIdOf(before),
    action: "delete",
    beforeData: before as JsonRecord,
    afterData: null,
    summary: options?.summary ?? buildSummary("delete", entityLabels[table], before),
    reason: options?.reason,
  });

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}

export async function insertHistory({
  userId,
  entityType,
  entityId,
  projectId,
  action,
  beforeData,
  afterData,
  summary,
  reason,
}: {
  userId: string;
  entityType: string;
  entityId: string;
  projectId?: string | null;
  action: string;
  beforeData: JsonRecord | null;
  afterData: JsonRecord | null;
  summary?: string | null;
  reason?: string | null;
}): Promise<ChangeHistory> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("change_history").insert({
    user_id: userId,
    project_id: projectId ?? null,
    entity_type: entityType,
    entity_id: entityId,
    action,
    before_data: beforeData,
    after_data: afterData,
    summary: summary ?? null,
    reason: reason ?? null,
  }).select("*").single();
  if (error) throw error;
  return data as ChangeHistory;
}

export async function listChangeHistory(): Promise<ChangeHistory[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("change_history")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ChangeHistory[];
}

export async function listPairHistory(pair: AdLpPair): Promise<ChangeHistory[]> {
  const supabase = getSupabaseBrowserClient();
  const entityIds = [pair.id, pair.twitter_ad_id, pair.landing_page_id];
  const { data, error } = await supabase
    .from("change_history")
    .select("*")
    .in("entity_id", entityIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ChangeHistory[];
}

export async function listAnalysisRuns(pairId: string): Promise<AnalysisRun[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("analysis_runs")
    .select("*")
    .eq("ad_lp_pair_id", pairId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AnalysisRun[];
}

export async function listLandingPageVersions(lpId: string): Promise<LandingPageVersion[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("landing_page_versions")
    .select("*")
    .eq("landing_page_id", lpId)
    .order("version_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LandingPageVersion[];
}

export async function listRecentMarketResearchRuns(limit = 10): Promise<MarketResearchRun[]> {
  return safeDashboardList(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("market_research_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((run) => ({ ...run, sources: [], insights: [] })) as MarketResearchRun[];
  });
}

export async function listRecentImprovementOutcomes(limit = 10): Promise<ImprovementOutcome[]> {
  return safeDashboardList(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("improvement_outcomes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as ImprovementOutcome[];
  });
}

export async function listRecentProductReviewRuns(limit = 10): Promise<ProductReviewRun[]> {
  return safeDashboardList(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("product_review_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as ProductReviewRun[];
  });
}

export async function listHighPriorityProductBacklog(limit = 10): Promise<ProductBacklogItem[]> {
  return safeDashboardList(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("product_improvement_backlog")
      .select("*")
      .in("priority", ["critical", "high"])
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as ProductBacklogItem[];
  });
}

export async function listTopEvidenceClusters(limit = 10): Promise<EvidenceCluster[]> {
  return safeDashboardList(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("evidence_clusters")
      .select("*")
      .order("evidence_count", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as EvidenceCluster[];
  });
}

export async function listRecentRoadmaps(limit = 10): Promise<ProductRoadmap[]> {
  return safeDashboardList(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("product_roadmaps")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as ProductRoadmap[];
  });
}

export async function listOpenIntelligenceAlerts(limit = 10): Promise<IntelligenceAlert[]> {
  return safeDashboardList(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("intelligence_alerts")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as IntelligenceAlert[];
  });
}

export async function listRecentLearningPatterns(limit = 10): Promise<LearningPattern[]> {
  return safeDashboardList(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("learning_patterns")
      .select("*")
      .order("recommendation_bias", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as LearningPattern[];
  });
}

async function nextLandingPageVersion(lpId: string) {
  const versions = await listLandingPageVersions(lpId);
  const latest = versions[0]?.version_number ?? 0;
  return latest + 1;
}

async function insertLandingPageVersion(
  lp: LandingPage,
  versionNumber: number,
  historyId: string | null,
  changeSummary: string,
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("landing_page_versions").insert({
    user_id: lp.user_id,
    project_id: lp.project_id,
    landing_page_id: lp.id,
    version_number: versionNumber,
    snapshot: lp,
    change_summary: changeSummary,
    created_from_history_id: historyId,
  });
  if (error) throw error;
}

function buildSummary(action: string, entityType: string, data: Record<string, unknown>) {
  const name = typeof data.name === "string" ? data.name : String(data.id ?? entityType);
  return `${entityType} ${action}: ${name}`;
}

function projectIdOf(data: Record<string, unknown>) {
  return typeof data.project_id === "string" ? data.project_id : null;
}
