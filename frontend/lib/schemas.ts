import { z } from "zod";

export const AdMetricsSchema = z.object({
  campaign_id: z.string(),
  impressions: z.number(),
  clicks: z.number(),
  ctr: z.number(),
  cpc: z.number(),
  cvr: z.number(),
  spend: z.number(),
  conversions: z.number().optional(),
  reach: z.number().optional(),
  frequency: z.number().optional(),
});

export const CampaignSchema = z.object({
  campaign_id: z.string(),
  campaign_name: z.string(),
  budget: z.number(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  status: z.string(),
});

export const AdCreativeSchema = z.object({
  headline: z.string(),
  body: z.string(),
  cta: z.string(),
  image: z.string().nullable(),
  video: z.string().nullable(),
});

export const LPAnalysisSchema = z.object({
  structure: z.object({
    hero_title: z.string(),
    hero_subtitle: z.string(),
    cta_count: z.number(),
    buttons: z.array(z.string()),
    faq: z.array(z.string()),
  }),
  behavior: z.object({
    bounce_rate: z.number(),
    session_duration: z.number(),
    scroll_depth: z.number(),
  }),
  performance: z.object({
    page_speed: z.number(),
    fcp: z.number(),
    lcp: z.number(),
  }),
});

export const AdImprovementResultSchema = z.object({
  problems: z.array(z.string()),
  suggestions: z.array(z.string()),
  headlines: z.array(z.string()),
  bodies: z.array(z.string()),
  ctas: z.array(z.string()),
});

export const LPImprovementResultSchema = z.object({
  hero: z.array(z.string()),
  cta: z.array(z.string()),
  faq: z.array(z.string()),
  structure: z.array(z.string()),
  mobile_ui: z.array(z.string()),
});

export const DiffResultSchema = z.object({
  files: z.array(
    z.object({
      path: z.string(),
      changes: z.array(
        z.object({
          before: z.string(),
          after: z.string(),
        }),
      ),
    }),
  ),
});

export const ReviewResultSchema = z.object({
  exaggerated_claims: z.array(z.string()),
  brand_risks: z.array(z.string()),
  ui_risks: z.array(z.string()),
  dangerous_changes: z.array(z.string()),
  approved_for_pr: z.boolean(),
});

export const PullRequestSchema = z.object({
  pr_number: z.number(),
  pr_url: z.string(),
});

export const WorkflowResultSchema = z.object({
  ads: z.object({
    campaigns: z.array(CampaignSchema),
    ad_groups: z.array(
      z.object({
        targeting: z.record(z.unknown()),
        interests: z.array(z.string()),
        age_range: z.string(),
        gender: z.string(),
        location: z.string(),
        device: z.string(),
      }),
    ),
    ads: z.array(AdCreativeSchema),
    performance: z.array(AdMetricsSchema),
    time: z.array(
      z.object({
        timestamp: z.string(),
        hour: z.number(),
        weekday: z.string(),
      }),
    ),
  }),
  lp: LPAnalysisSchema,
  features: z.object({
    ctr_trend: z.number(),
    bounce_rate: z.number(),
    hero_similarity: z.number(),
    cta_strength: z.number(),
    device: z.string(),
    weekday: z.string(),
  }),
  ad_improvements: AdImprovementResultSchema,
  lp_improvements: LPImprovementResultSchema,
  diff: DiffResultSchema,
  review: ReviewResultSchema,
  storage: z.object({
    storage_provider: z.string(),
    record_id: z.string(),
    saved_at: z.string(),
    table: z.string().nullable(),
  }),
  pull_request: PullRequestSchema.nullable(),
});

export const SettingsSchema = z.object({
  apiBaseUrl: z.string().url(),
  githubRepository: z.string().min(3),
  supabaseProject: z.string().min(2),
  xAdsStatus: z.enum(["connected", "not_connected", "pending"]),
  analysisSchedule: z.string().min(2),
});

export type WorkflowResult = z.infer<typeof WorkflowResultSchema>;
export type Campaign = z.infer<typeof CampaignSchema> & {
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cvr: number;
  spend: number;
  trend: number;
  lastAnalyzedAt: string;
};
export type LPAnalysis = z.infer<typeof LPAnalysisSchema>;
export type Improvement = {
  id: string;
  problem: string;
  adSuggestions: string[];
  lpSuggestions: string[];
  confidence: number;
  expectedCtrImpact: number;
  expectedCvrImpact: number;
  riskLevel: "Low" | "Medium" | "High";
  reviewStatus: "Pending" | "Approved" | "Rejected";
  diff: z.infer<typeof DiffResultSchema>;
  review: z.infer<typeof ReviewResultSchema>;
  campaignId: string;
};
export type PullRequest = {
  id: string;
  title: string;
  url: string;
  status: "Open" | "Draft" | "Closed";
  createdAt: string;
  relatedCampaign: string;
  relatedImprovement: string;
};
