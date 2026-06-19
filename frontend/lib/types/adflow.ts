export type UUID = string;

export type JsonRecord = Record<string, unknown>;

export type AdProject = {
  id: UUID;
  user_id: UUID;
  name: string;
  description: string | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  archived_at: string | null;
  deleted_at: string | null;
  duplicated_from: UUID | null;
  created_at: string;
  updated_at: string;
};

export type TwitterAd = {
  id: UUID;
  user_id: UUID;
  project_id: UUID | null;
  name: string;
  campaign_name: string | null;
  ad_group_name: string | null;
  headline: string | null;
  body: string | null;
  cta: string | null;
  destination_url: string;
  image_url: string | null;
  video_url: string | null;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  cvr: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type LandingPage = {
  id: UUID;
  user_id: UUID;
  project_id: UUID | null;
  name: string;
  url: string;
  hero_title: string | null;
  hero_subtitle: string | null;
  primary_cta: string | null;
  secondary_cta: string | null;
  offer_text: string | null;
  target_audience: string | null;
  bounce_rate: number | null;
  session_duration: number | null;
  scroll_depth: number | null;
  page_speed: number | null;
  fcp: number | null;
  lcp: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type LandingPageVersion = {
  id: UUID;
  user_id: UUID;
  project_id: UUID | null;
  landing_page_id: UUID;
  version_number: number;
  snapshot: JsonRecord;
  change_summary: string | null;
  created_from_history_id: UUID | null;
  created_at: string;
};

export type AdLpPair = {
  id: UUID;
  user_id: UUID;
  project_id: UUID | null;
  twitter_ad_id: UUID;
  landing_page_id: UUID;
  name: string;
  status: string;
  last_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
  twitter_ads?: TwitterAd | null;
  landing_pages?: LandingPage | null;
};

export type ChangeHistory = {
  id: UUID;
  user_id: UUID;
  project_id: UUID | null;
  entity_type: "ad_project" | "twitter_ad" | "landing_page" | "ad_lp_pair" | string;
  entity_id: UUID;
  action: "create" | "update" | "delete" | string;
  before_data: JsonRecord | null;
  after_data: JsonRecord | null;
  summary: string | null;
  reason: string | null;
  created_at: string;
};

export type AIHistoryBasedRecommendation = {
  ai_mode?: "multi_provider" | "openai_only";
  demand_intelligence_run_id?: UUID | null;
  overall_diagnosis: string;
  likely_problem: string;
  history_based_insights: Array<{
    finding: string;
    evidence: string;
    recommendation: string;
  }>;
  ad_recommendations: Array<{
    field: string;
    current_value: string;
    suggested_value: string;
    reason: string;
    expected_effect: string;
    risk: "low" | "medium" | "high";
  }>;
  lp_recommendations: Array<{
    field: string;
    current_value: string;
    suggested_value: string;
    reason: string;
    expected_effect: string;
    risk: "low" | "medium" | "high";
  }>;
  do_not_change: Array<{
    field: string;
    reason: string;
  }>;
  next_test_plan: {
    hypothesis: string;
    test_target: string;
    success_metric: string;
    duration_days: number;
  };
  market_insights?: Array<{
    finding: string;
    evidence: string;
    recommendation: string;
  }>;
  competitor_summary?: string[];
  pain_point_alignment?: Array<{
    finding: string;
    evidence: string;
    recommendation: string;
  }>;
  positioning_opportunities?: string[];
  market_alignment_score?: number;
  market_fit_analysis?: string;
  recommended_positioning?: string[];
  market_opportunities?: string[];
  feature_suggestions?: JsonRecord[];
  demand_signal_scores?: JsonRecord[];
  trend_analysis?: JsonRecord[];
  competitor_gaps?: JsonRecord[];
  root_causes?: JsonRecord[];
  evidence_summary?: JsonRecord[];
  validation_summary?: JsonRecord;
  solution_fit_summary?: JsonRecord;
  monitoring_summary?: JsonRecord;
  source_status_summary?: JsonRecord;
  strong_validated_clusters?: JsonRecord[];
  weak_or_noisy_clusters?: JsonRecord[];
  matched_solution_pains?: string[];
  unmatched_solution_pains?: string[];
  emerging_demand_signals?: JsonRecord[];
  growing_demand_signals?: JsonRecord[];
  search_demand_summary?: JsonRecord;
  market_size_summary?: JsonRecord;
  outcome_learning_summary?: JsonRecord;
  validated_demand_patterns?: string[];
  failed_demand_patterns?: string[];
  inconclusive_demand_patterns?: string[];
  promising_segments?: JsonRecord[];
  small_market_warnings?: string[];
  recommended_next_tests?: string[];
  outcome_insights?: Array<{
    finding: string;
    evidence: string;
    recommendation: string;
  }>;
  successful_improvement_patterns?: string[];
  failed_improvement_patterns?: string[];
  outcome_based_warnings?: string[];
  recommended_next_measurement?: string;
  orchestration_run_id?: UUID;
  route_plan?: AIOrchestrationRun["route_plan"];
  agent_results?: Array<{
    task: string;
    agent_key: string;
    provider: string;
    provider_type: "REAL" | "MOCK";
    failure_reason: string | null;
    source_provider: string;
    role: string;
    input_summary: string;
    output: {
      summary: string;
      findings: string[];
      recommendations: string[];
      score: number | null;
      risk_level: string | null;
      next_action: string | null;
    };
  }>;
};

export type AnalysisRun = {
  id: UUID;
  user_id: UUID;
  project_id: UUID | null;
  ad_lp_pair_id: UUID;
  score: number | null;
  ctr_trend: number | null;
  hero_similarity: number | null;
  cta_strength: number | null;
  bounce_rate: number | null;
  risk_level: string | null;
  provider_type: "REAL" | "MOCK";
  failure_reason: string | null;
  source_provider: string;
  ad_improvements: JsonRecord | null;
  lp_improvements: JsonRecord | null;
  diff_plan: JsonRecord | null;
  review_result: JsonRecord | null;
  history_insights: AIHistoryBasedRecommendation | JsonRecord | null;
  created_at: string;
};

export type AIAgent = {
  id: UUID;
  user_id: UUID;
  agent_key: string;
  display_name: string;
  provider: "grok" | "gemini" | "chatgpt" | "codex" | string;
  role: string;
  strengths: string[];
  default_tasks: string[];
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type AIOrchestrationRun = {
  id: UUID;
  user_id: UUID;
  project_id: UUID | null;
  ad_lp_pair_id: UUID | null;
  platform: string;
  objective: string;
  router_version: string;
  route_plan: Array<{
    task: string;
    agent_key: string;
    provider: string;
    role: string;
    reason: string;
  }>;
  route_reason: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
};

export type AIAgentResult = {
  id: UUID;
  user_id: UUID;
  project_id: UUID | null;
  orchestration_run_id: UUID;
  ad_lp_pair_id: UUID | null;
  agent_key: string;
  provider: string;
  provider_type: "REAL" | "MOCK";
  failure_reason: string | null;
  source_provider: string;
  role: string;
  task: string;
  input_summary: string | null;
  output: JsonRecord;
  score: number | null;
  risk_level: string | null;
  decision_status: ImprovementStatus;
  decision_reason: string | null;
  decided_at: string | null;
  accepted_by: UUID | null;
  updated_by: UUID | null;
  status_updated_at: string;
  apply_ready_metadata: JsonRecord;
  confidence: number | null;
  predicted_effect: JsonRecord;
  status: string;
  created_at: string;
};

export type ImprovementStatus = "GENERATED" | "APPROVED" | "REJECTED" | "APPLY_READY" | "APPLIED" | "FAILED";

export type ImprovementStatusHistory = {
  id: UUID;
  improvement_id: UUID;
  user_id: UUID;
  old_status: ImprovementStatus | null;
  new_status: ImprovementStatus;
  changed_by: UUID;
  changed_at: string;
  reason: string | null;
};

export type ImprovementStats = {
  total: number;
  counts: Record<ImprovementStatus, number>;
  approval_rate: number;
  rejection_rate: number;
};

export type AIAgentScorecard = {
  id: UUID;
  user_id: UUID;
  agent_key: string;
  provider: string;
  platform: string;
  metric: string;
  sample_count: number;
  average_score: number;
  accepted_count: number;
  rejected_count: number;
  apply_ready_count: number;
  avg_confidence: number;
  avg_risk: number;
  estimated_ctr_lift: number;
  estimated_cvr_lift: number;
  estimated_bounce_reduction: number;
  router_score: number;
  last_result_id: UUID | null;
  updated_at: string;
};

export type CodexTaskPrompt = {
  id: UUID;
  user_id: UUID;
  project_id: UUID | null;
  source_ai_result_id: UUID;
  title: string;
  target_files_hint: string[];
  implementation_goal: string;
  constraints: string[];
  acceptance_criteria: string[];
  prompt: JsonRecord;
  status: CodexTaskStatus;
  summary: string | null;
  updated_at: string;
  last_run_at: string | null;
  result_summary: string | null;
  execution_mode: CodexExecutionMode | null;
  pr_url: string | null;
  outcome_id: UUID | null;
  error_message: string | null;
  error_code: string | null;
  created_at: string;
};

export type CodexTaskStatus = "CREATED" | "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "PR_CREATED" | "OUTCOME_CREATED";
export type CodexExecutionMode = "REAL_EXECUTION" | "MANUAL_EXECUTION" | "MOCK";
export type CodexExecution = {
  id: UUID; task_id: UUID; execution_mode: CodexExecutionMode; status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  started_at: string | null; finished_at: string | null; stdout: string | null; stderr: string | null; summary: string | null;
  files_changed: Array<{ path: string; content: string }>; diff_summary: string | null; error_message: string | null; error_code: string | null; created_at: string;
};
export type CodexTaskDetail = {
  task: CodexTaskPrompt; improvement: AIAgentResult; project: AdProject | null; pair: AdLpPair | null; ad: TwitterAd | null; landing_page: LandingPage | null;
  history: Array<{ id: UUID; old_status: CodexTaskStatus | null; new_status: CodexTaskStatus; reason: string | null; changed_at: string }>;
  executions: CodexExecution[]; pull_requests: Array<{ id: UUID; pr_url: string | null; pr_number: number | null; status: string }>; outcomes: ImprovementOutcome[];
};

export type DemandCluster = {
  id: string;
  cluster_type: "pain" | "desire";
  name: string;
  category: string;
  count: number;
  source_count: number;
  representative_quotes: string[];
  growth_rate: number;
  confidence: number;
  persona_ratios: Record<string, number>;
  root_causes: string[];
  demand_signal_score: number;
  trend: "increasing" | "decreasing" | "spiking" | "flat";
  evidence_signal_indexes: number[];
  validation_score: number;
  fit_score: number | null;
  trend_status: "unknown" | "emerging" | "growing" | "stable" | "declining" | "spike" | "noise";
  source_diversity: number;
  noise_ratio: number;
  duplicate_ratio: number;
  evidence_quality_score: number;
  data_source_type: "REAL" | "SYNTHETIC";
};

export type DemandOpportunity = {
  name: string;
  description: string;
  evidence: string[];
  related_clusters: string[];
  related_competitors: string[];
  expected_value: string;
  risks: string[];
};

export type DemandFeatureSuggestion = {
  feature_name: string;
  solves: string[];
  reason: string;
  priority: "high" | "medium" | "low";
  mvp: string;
  expansion: string;
};

export type DemandPositioning = {
  recommended_position: string;
  differentiation_points: string[];
  competitor_comparison: string[];
  key_messages: string[];
};

export type DemandAdAppeal = {
  appeal_axis: string;
  hooks: string[];
  headlines: string[];
  bodies: string[];
  ctas: string[];
};

export type DemandLPContext = {
  hero_improvements: string[];
  cta_improvements: string[];
  faq_ideas: string[];
  section_ideas: string[];
  structure_improvements: string[];
};

export type DemandIntelligenceSummary = {
  overview: string;
  top_pain_clusters: DemandCluster[];
  top_desire_clusters: DemandCluster[];
  top_demand_signals: DemandCluster[];
  emerging_trends: JsonRecord[];
  competitor_gaps: JsonRecord[];
  opportunities: DemandOpportunity[];
  recommended_features: DemandFeatureSuggestion[];
  recommended_positioning: DemandPositioning;
  ad_appeals: DemandAdAppeal[];
  lp_improvement_context: DemandLPContext;
  evidence_summary: JsonRecord[];
  guardrails: string[];
  source_status_summary: DemandSourceStatusSummary | JsonRecord;
  validation_summary: DemandValidationSummary | JsonRecord;
  solution_fit_summary: DemandSolutionFitSummary | JsonRecord;
  monitoring_summary: DemandMonitoringSummary | JsonRecord;
  search_demand_summary: DemandSearchDemandSummary | JsonRecord;
  market_size_summary: DemandMarketSizeSummary | JsonRecord;
    outcome_learning_summary: DemandOutcomeLearningSummary | JsonRecord;
    real_evidence_summary: JsonRecord;
    demand_score_summary: JsonRecord;
    competitor_discovery_summary: JsonRecord;
    learning_context: JsonRecord;
    pair_analysis_context: JsonRecord;
  };

export type DemandIntelligenceSignal = {
  id: UUID;
  run_id: UUID;
  collected_at: string;
  source_type: string;
  data_source_type: "REAL" | "SYNTHETIC";
  source_name: string;
  external_id: string | null;
  connector_key: string | null;
  url: string | null;
  title: string;
  body: string;
  posted_at: string | null;
  engagement: JsonRecord;
  language: string;
  quality_score: number;
  noise_score: number;
  spam_score: number;
  duplicate_group_id: string | null;
  validation_score: number;
  metadata: JsonRecord;
  created_at: string;
};

export type DemandSignalValidation = {
  id: UUID;
  user_id: UUID;
  run_id: UUID;
  cluster_id: UUID | null;
  signal_id: UUID | null;
  validation_target: "signal" | "cluster" | "run_summary";
  validation_score: number;
  confidence: number;
  cross_source_confirmed: boolean;
  source_diversity: number;
  duplicate_ratio: number;
  noise_ratio: number;
  spam_ratio: number;
  recency_score: number;
  continuity_score: number;
  bias_warnings: string[];
  validation_reasons: string[];
  created_at: string;
};

export type DemandSolutionFit = {
  id: UUID;
  user_id: UUID;
  run_id: UUID;
  project_id: UUID | null;
  ad_lp_pair_id: UUID | null;
  cluster_id: UUID | null;
  fit_target_type: "app_idea" | "ad_copy" | "lp_hero" | "lp_offer" | "feature" | "positioning" | "pair";
  fit_target_id: string | null;
  fit_target_text: string;
  fit_score: number;
  coverage_score: number;
  gap_score: number;
  confidence: number;
  matched_pains: string[];
  unmatched_pains: string[];
  recommended_adjustments: string[];
  evidence_signal_ids: string[];
  created_at: string;
};

export type DemandSignalSnapshot = {
  id: UUID;
  user_id: UUID;
  project_id: UUID | null;
  ad_lp_pair_id: UUID | null;
  run_id: UUID | null;
  cluster_id: UUID | null;
  cluster_name: string;
  cluster_type: string;
  category: string | null;
  snapshot_date: string;
  signal_count: number;
  source_count: number;
  demand_signal_score: number;
  validation_score: number;
  fit_score: number | null;
  growth_7d: number | null;
  growth_30d: number | null;
  growth_90d: number | null;
  trend_status: "unknown" | "emerging" | "growing" | "stable" | "declining" | "spike" | "noise";
  metadata: JsonRecord;
  created_at: string;
};

export type DemandSourceRun = {
  id: UUID;
  user_id: UUID;
  run_id: UUID;
  source_type: string;
  connector_key: string;
  query: string;
  status: "pending" | "running" | "completed" | "partial" | "failed" | "skipped";
  requested_count: number;
  collected_count: number;
  stored_count: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  metadata: JsonRecord;
  created_at: string;
};

export type DemandConnectorLog = {
  id: UUID;
  user_id: UUID;
  run_id: UUID | null;
  source_run_id: UUID | null;
  connector_key: string;
  level: "debug" | "info" | "warning" | "error";
  message: string;
  metadata: JsonRecord;
  created_at: string;
};

export type DemandValidationSummary = {
  average_validation_score?: number;
  strong_validated_clusters?: JsonRecord[];
  weak_or_noisy_clusters?: JsonRecord[];
  cross_source_confirmed_count?: number;
};

export type DemandSolutionFitSummary = {
  average_fit_score?: number;
  top_solution_fit_gaps?: JsonRecord[];
  matched_solution_pains?: string[];
  unmatched_solution_pains?: string[];
  recommended_message_adjustments?: string[];
  feature_fit_scores?: JsonRecord[];
};

export type DemandMonitoringSummary = {
  emerging_clusters?: JsonRecord[];
  growing_clusters?: JsonRecord[];
  stable_clusters?: JsonRecord[];
  declining_clusters?: JsonRecord[];
  spike_warnings?: JsonRecord[];
  noise_warnings?: JsonRecord[];
  top_growth_signals?: JsonRecord[];
};

export type DemandSourceStatusSummary = {
  real_sources_enabled?: boolean;
  synthetic_fallback?: boolean;
  sources?: DemandSourceRun[] | JsonRecord[];
  completed_count?: number;
  partial_count?: number;
  failed_count?: number;
  skipped_count?: number;
  collected_count?: number;
};

export type DemandSearchSignal = {
  id: UUID;
  user_id: UUID;
  run_id: UUID;
  project_id: UUID | null;
  ad_lp_pair_id: UUID | null;
  query: string;
  keyword: string;
  source_type: string;
  data_source_type: "REAL" | "SYNTHETIC";
  search_volume_estimate: number | null;
  competition_level: string | null;
  cpc_estimate: number | null;
  related_keywords: string[];
  suggest_queries: string[];
  people_also_ask: string[];
  trend_status: string;
  confidence: number;
  metadata: JsonRecord;
  created_at: string;
};

export type DemandMarketSizeEstimate = {
  id: UUID;
  user_id: UUID;
  run_id: UUID;
  project_id: UUID | null;
  ad_lp_pair_id: UUID | null;
  cluster_id: UUID | null;
  segment_name: string;
  data_source_type: "REAL" | "SYNTHETIC";
  persona: string | null;
  estimated_audience_size_min: number | null;
  estimated_audience_size_max: number | null;
  search_demand_score: number;
  pain_signal_score: number;
  competitor_gap_score: number;
  market_size_score: number;
  confidence: number;
  assumptions: string[];
  evidence: JsonRecord[];
  created_at: string;
};

export type DemandOutcomeLearningLink = {
  id: UUID;
  user_id: UUID;
  run_id: UUID | null;
  cluster_id: UUID | null;
  ad_lp_pair_id: UUID | null;
  analysis_run_id: UUID | null;
  outcome_id: UUID | null;
  demand_signal_score: number | null;
  validation_score: number | null;
  fit_score: number | null;
  search_demand_score: number | null;
  market_size_score: number | null;
  before_metrics: JsonRecord;
  after_metrics: JsonRecord;
  metric_delta: JsonRecord;
  learning_status: "positive" | "neutral" | "negative" | "inconclusive" | "unknown";
  learning_summary: string | null;
  created_at: string;
};

export type DemandSearchDemandSummary = {
  search_demand_score?: number;
  top_search_keywords?: JsonRecord[];
  low_search_warning?: string[];
  high_search_opportunity?: string[];
  guardrail?: string;
  rows?: DemandSearchSignal[] | JsonRecord[];
};

export type DemandMarketSizeSummary = {
  market_size_score?: number;
  promising_segments?: JsonRecord[];
  small_market_warnings?: string[];
  persona_market_estimates?: JsonRecord[];
  guardrail?: string;
  rows?: DemandMarketSizeEstimate[] | JsonRecord[];
};

export type DemandOutcomeLearningSummary = {
  outcome_learning_summary?: JsonRecord;
  validated_demand_patterns?: string[];
  failed_demand_patterns?: string[];
  inconclusive_demand_patterns?: string[];
  recommended_next_tests?: string[];
  linked_outcome_count?: number;
  guardrail?: string;
  rows?: DemandOutcomeLearningLink[] | JsonRecord[];
};

export type DemandIntelligenceRun = {
  id: UUID;
  user_id: UUID;
  project_id: UUID | null;
  ad_lp_pair_id: UUID;
  query: string;
  status: string;
  summary: DemandIntelligenceSummary | JsonRecord;
  real_sources_enabled: boolean;
  source_status_summary: DemandSourceStatusSummary | JsonRecord;
  validation_summary: DemandValidationSummary | JsonRecord;
  solution_fit_summary: DemandSolutionFitSummary | JsonRecord;
  monitoring_summary: DemandMonitoringSummary | JsonRecord;
  search_demand_summary: DemandSearchDemandSummary | JsonRecord;
  market_size_summary: DemandMarketSizeSummary | JsonRecord;
  outcome_learning_summary: DemandOutcomeLearningSummary | JsonRecord;
  created_at: string;
  signals: DemandIntelligenceSignal[];
  clusters: DemandCluster[];
};

export type ImprovementOutcomeStatus =
  | "DRAFT"
  | "PENDING_MEASUREMENT"
  | "MEASURING"
  | "SUCCESS"
  | "PARTIAL_SUCCESS"
  | "NO_IMPACT"
  | "FAILED"
  | "ARCHIVED";

export type ImprovementOutcome = {
  id: UUID;
  user_id: UUID;
  project_id: UUID | null;
  ad_lp_pair_id: UUID;
  source_ai_result_id: UUID | null;
  source_codex_task_id: UUID | null;
  source_github_pr_id: UUID | null;
  title: string;
  description: string | null;
  summary: string | null;
  implemented_at: string | null;
  measured_at: string | null;
  before_metrics: JsonRecord;
  after_metrics: JsonRecord;
  metric_delta: JsonRecord;
  outcome_status: ImprovementOutcomeStatus;
  outcome_summary: string | null;
  learning_notes: string | null;
  expected_impact: JsonRecord;
  measurement_plan: JsonRecord;
  measurement_period: JsonRecord;
  measurement_method: string | null;
  measurement_source: string;
  evidence_data: JsonRecord[];
  evaluation_thresholds: JsonRecord;
  improvement_rate: number | null;
  evaluation_result: JsonRecord;
  created_by: UUID;
  updated_by: UUID | null;
  status_updated_at: string;
  created_at: string;
  updated_at: string;
};

export type OutcomeLearningData = {
  id: UUID; outcome_id: UUID; project_id: UUID | null; improvement_id: UUID | null; improvement_type: string;
  project_type: string | null; market_type: string | null; before_metrics: JsonRecord; after_metrics: JsonRecord;
  improvement_rate: number; success_flag: boolean; confidence_score: number; measurement_quality: number;
  outcome_status: ImprovementOutcomeStatus; learning_score: number; created_at: string; updated_at: string;
};

export type OutcomeDetail = {
  outcome: ImprovementOutcome;
  improvement: AIAgentResult | null;
  codex_task: CodexTaskPrompt | null;
  github_pr: { id: UUID; pr_url: string | null; pr_number: number | null; status: string; repository: string } | null;
  project: AdProject | null;
  history: Array<{ id: UUID; old_status: ImprovementOutcomeStatus | null; new_status: ImprovementOutcomeStatus; changed_by: UUID; changed_at: string; reason: string | null; measurement_source: string | null }>;
  learning: OutcomeLearningData[];
};

export type OutcomeStats = {
  total: number; counts: Record<ImprovementOutcomeStatus, number>; success_rate: number; failure_rate: number;
  average_improvement_rate: number; average_ctr_improvement: number; average_cvr_improvement: number;
  learning: { learning_count: number; success_count: number; failure_count: number; success_rate: number; average_improvement_rate: number; by_market: JsonRecord[]; by_improvement: JsonRecord[]; by_project: JsonRecord[] };
};

export type EntityName =
  | "ad_projects"
  | "twitter_ads"
  | "landing_pages"
  | "ad_lp_pairs";
