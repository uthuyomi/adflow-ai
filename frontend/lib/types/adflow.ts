export type UUID = string;

export type JsonRecord = Record<string, unknown>;

export type AdProject = {
  id: UUID;
  user_id: UUID;
  name: string;
  description: string | null;
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
  market_research_run_id?: UUID | null;
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
  role: string;
  task: string;
  input_summary: string | null;
  output: JsonRecord;
  score: number | null;
  risk_level: string | null;
  decision_status: "pending" | "accepted" | "rejected" | "needs_review" | "apply_ready";
  decision_reason: string | null;
  decided_at: string | null;
  accepted_by: UUID | null;
  confidence: number | null;
  predicted_effect: JsonRecord;
  status: string;
  created_at: string;
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
  status: string;
  created_at: string;
};

export type MarketResearchSummary = {
  market_overview: string;
  main_pain_points: string[];
  main_competitors: string[];
  opportunities: string[];
  warnings: string[];
  positioning_gaps: string[];
  social_research?: {
    pain_points?: string[];
    feature_requests?: string[];
    positive_mentions?: string[];
    negative_mentions?: string[];
  };
  search_research?: {
    search_intents?: string[];
    related_keywords?: string[];
    competitor_keywords?: string[];
  };
  competitor_research?: Array<{
    name?: string;
    description?: string;
    positioning?: string;
    pricing?: string;
    strengths?: string[];
    weaknesses?: string[];
  }>;
};

export type MarketResearchSource = {
  id: UUID;
  research_run_id: UUID;
  source_type: "twitter" | "reddit" | "search" | "competitor" | "review" | "forum" | "youtube";
  title: string;
  url: string | null;
  content: string;
  sentiment: string | null;
  relevance_score: number;
  created_at: string;
};

export type MarketResearchInsight = {
  id: UUID;
  research_run_id: UUID;
  category: string;
  title: string;
  description: string;
  confidence: number;
  created_at: string;
};

export type MarketResearchRun = {
  id: UUID;
  user_id: UUID;
  project_id: UUID | null;
  ad_lp_pair_id: UUID;
  query: string;
  status: string;
  summary: MarketResearchSummary | JsonRecord;
  created_at: string;
  sources: MarketResearchSource[];
  insights: MarketResearchInsight[];
};

export type ImprovementOutcomeStatus =
  | "pending"
  | "implemented"
  | "measured"
  | "positive"
  | "neutral"
  | "negative"
  | "inconclusive";

export type ImprovementOutcome = {
  id: UUID;
  user_id: UUID;
  project_id: UUID | null;
  ad_lp_pair_id: UUID;
  source_ai_result_id: UUID | null;
  source_codex_task_id: UUID | null;
  title: string;
  description: string | null;
  implemented_at: string | null;
  measured_at: string | null;
  before_metrics: JsonRecord;
  after_metrics: JsonRecord;
  metric_delta: JsonRecord;
  outcome_status: ImprovementOutcomeStatus;
  outcome_summary: string | null;
  learning_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type EntityName =
  | "ad_projects"
  | "twitter_ads"
  | "landing_pages"
  | "ad_lp_pairs";
