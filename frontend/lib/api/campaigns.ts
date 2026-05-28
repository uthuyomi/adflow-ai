import { buildCampaigns, metricSeries } from "@/lib/mock-data";
import { runWorkflow } from "@/lib/api/client";

export async function getCampaigns() {
  const workflow = await runWorkflow();
  return buildCampaigns(workflow);
}

export async function getCampaignDetail(campaignId: string) {
  const workflow = await runWorkflow();
  const campaigns = buildCampaigns(workflow);
  const campaign = campaigns.find((item) => item.campaign_id === campaignId) ?? campaigns[0];
  return {
    campaign,
    creative: workflow.ads.ads[0],
    metrics: metricSeries,
    problems: workflow.ad_improvements.problems,
    suggestions: workflow.ad_improvements.suggestions,
    alignment: workflow.features.hero_similarity,
    riskLevel: "Medium" as const,
  };
}
