import type { Campaign, Improvement, LPAnalysis, PullRequest, WorkflowResult } from "@/lib/schemas";

export const metricSeries = [
  { label: "Mon", ctr: 7.4, cvr: 3.1, cpc: 96, spend: 142080 },
  { label: "Tue", ctr: 6.8, cvr: 2.9, cpc: 104, spend: 131200 },
  { label: "Wed", ctr: 5.9, cvr: 2.6, cpc: 118, spend: 138600 },
  { label: "Thu", ctr: 5.2, cvr: 2.4, cpc: 126, spend: 140100 },
  { label: "Fri", ctr: 4.7, cvr: 2.2, cpc: 132, spend: 136488 },
];

export const fallbackWorkflow: WorkflowResult = {
  ads: {
    campaigns: [
      {
        campaign_id: "cmp_001",
        campaign_name: "Route Automation Launch",
        budget: 120000,
        start_date: "2026-05-01",
        end_date: null,
        status: "active",
      },
      {
        campaign_id: "cmp_002",
        campaign_name: "Field Sales Retargeting",
        budget: 84000,
        start_date: "2026-05-10",
        end_date: null,
        status: "active",
      },
      {
        campaign_id: "cmp_003",
        campaign_name: "LP Validation Test",
        budget: 42000,
        start_date: "2026-05-15",
        end_date: "2026-06-15",
        status: "paused",
      },
    ],
    ad_groups: [
      {
        targeting: { keyword: "route planning" },
        interests: ["field sales", "delivery", "operations"],
        age_range: "25-54",
        gender: "all",
        location: "JP",
        device: "mobile",
      },
    ],
    ads: [
      {
        headline: "Create routes easily",
        body: "Turn address lists into Google Maps routes.",
        cta: "Try for free",
        image: null,
        video: null,
      },
    ],
    performance: [
      {
        campaign_id: "cmp_001",
        impressions: 20000,
        clicks: 1480,
        ctr: 7.4,
        cpc: 96,
        cvr: 3.1,
        spend: 142080,
        conversions: 45,
        reach: 18000,
        frequency: 1.11,
      },
      {
        campaign_id: "cmp_001",
        impressions: 22000,
        clicks: 1034,
        ctr: 4.7,
        cpc: 132,
        cvr: 2.2,
        spend: 136488,
        conversions: 23,
        reach: 19000,
        frequency: 1.16,
      },
    ],
    time: [{ timestamp: "2026-05-27T10:00:00+09:00", hour: 10, weekday: "Friday" }],
  },
  lp: {
    structure: {
      hero_title: "Create routes easily",
      hero_subtitle: "Prepare address lists for Google Maps.",
      cta_count: 2,
      buttons: ["Try for free", "Request materials"],
      faq: ["Can I use CSV files?", "Can I use it on mobile?"],
    },
    behavior: { bounce_rate: 74, session_duration: 42, scroll_depth: 58 },
    performance: { page_speed: 82, fcp: 1.2, lcp: 2.4 },
  },
  features: {
    ctr_trend: -36,
    bounce_rate: 74,
    hero_similarity: 64,
    cta_strength: 69,
    device: "mobile",
    weekday: "Friday",
  },
  ad_improvements: {
    problems: ["CTR is declining on the selected segment.", "Ad hook is less specific than LP value."],
    suggestions: ["Make the outcome concrete in the headline.", "Align CTA with landing page hero promise."],
    headlines: ["Create 50 Google Maps routes in 30 seconds", "Turn address lists into routes faster"],
    bodies: ["Upload addresses and generate route-ready maps without manual sorting."],
    ctas: ["Try route automation", "Create routes faster"],
  },
  lp_improvements: {
    hero: ["Replace abstract hero copy with a measurable workflow outcome."],
    cta: ["Use one primary CTA above the fold and repeat it after proof points."],
    faq: ["Add FAQ items for import limits, supported formats, and setup time."],
    structure: ["Move proof points before secondary feature details."],
    mobile_ui: ["Keep the first mobile viewport focused on title, proof, and CTA."],
  },
  diff: {
    files: [
      {
        path: "app/page.tsx",
        changes: [
          {
            before: "Create routes easily",
            after: "Turn 50 addresses into Google Maps routes in 30 seconds",
          },
        ],
      },
    ],
  },
  review: {
    exaggerated_claims: [],
    brand_risks: [],
    ui_risks: ["Hero copy may wrap on small mobile widths."],
    dangerous_changes: [],
    approved_for_pr: true,
  },
  storage: {
    storage_provider: "memory",
    record_id: "local-preview",
    saved_at: "2026-05-27T20:48:57.481738Z",
    table: null,
  },
  pull_request: {
    pr_number: 1,
    pr_url: "https://github.example/local-preview/adflow/local-preview",
  },
};

export function buildCampaigns(workflow: WorkflowResult): Campaign[] {
  const latest = workflow.ads.performance.at(-1) ?? workflow.ads.performance[0];
  return workflow.ads.campaigns.map((campaign, index) => ({
    ...campaign,
    impressions: latest.impressions - index * 1800,
    clicks: latest.clicks - index * 110,
    ctr: Math.max(latest.ctr - index * 0.4, 1.2),
    cpc: latest.cpc + index * 9,
    cvr: Math.max(latest.cvr - index * 0.2, 0.8),
    spend: latest.spend - index * 18000,
    trend: workflow.features.ctr_trend + index * 8,
    lastAnalyzedAt: "12 min ago",
  }));
}

export function buildImprovements(workflow: WorkflowResult): Improvement[] {
  return workflow.ad_improvements.problems.map((problem, index) => ({
    id: `imp_${index + 1}`,
    problem,
    adSuggestions: workflow.ad_improvements.suggestions,
    lpSuggestions: [
      ...workflow.lp_improvements.hero,
      ...workflow.lp_improvements.cta,
      ...workflow.lp_improvements.structure,
    ],
    confidence: index === 0 ? 86 : 74,
    expectedCtrImpact: index === 0 ? 18 : 11,
    expectedCvrImpact: index === 0 ? 9 : 6,
    riskLevel: index === 0 ? "Medium" : "Low",
    reviewStatus: "Pending",
    diff: workflow.diff,
    review: workflow.review,
    campaignId: workflow.ads.campaigns[0]?.campaign_id ?? "cmp_001",
  }));
}

export function buildPrs(workflow: WorkflowResult): PullRequest[] {
  if (!workflow.pull_request) {
    return [];
  }
  return [
    {
      id: String(workflow.pull_request.pr_number),
      title: "Improve ad and landing page copy",
      url: workflow.pull_request.pr_url,
      status: "Open",
      createdAt: "Today, 05:48",
      relatedCampaign: "Route Automation Launch",
      relatedImprovement: "imp_1",
    },
  ];
}

export const fallbackLp: LPAnalysis = fallbackWorkflow.lp;
