import { listEntities } from "@/lib/supabase/adflow-repository";
import type { Campaign } from "@/lib/schemas";
import type { TwitterAd } from "@/lib/types/adflow";

export async function getCampaigns(): Promise<Campaign[]> {
  const ads = await listEntities("twitter_ads");
  const grouped = new Map<string, TwitterAd[]>();
  for (const ad of ads) {
    const key = ad.campaign_name || ad.name || "Unassigned";
    grouped.set(key, [...(grouped.get(key) ?? []), ad]);
  }

  return [...grouped.entries()].map(([name, items]) => {
    const impressions = sum(items, "impressions");
    const clicks = sum(items, "clicks");
    const conversions = sum(items, "conversions");
    const spend = sum(items, "spend");
    return {
      campaign_id: slugId(name),
      campaign_name: name,
      budget: spend,
      start_date: null,
      end_date: null,
      status: items.some((item) => item.status === "active") ? "active" : items[0]?.status ?? "unknown",
      impressions,
      clicks,
      ctr: impressions ? round((clicks / impressions) * 100) : average(items, "ctr"),
      cpc: clicks ? round(spend / clicks) : average(items, "cpc"),
      cvr: clicks ? round((conversions / clicks) * 100) : average(items, "cvr"),
      spend,
      trend: 0,
      lastAnalyzedAt: latestAnalyzedAt(items),
    };
  });
}

export async function getCampaignDetail(campaignId: string) {
  const campaigns = await getCampaigns();
  const campaign = campaigns.find((item) => item.campaign_id === campaignId);
  if (!campaign) return null;
  const ads = await listEntities("twitter_ads");
  const related = ads.find((ad) => slugId(ad.campaign_name || ad.name || "Unassigned") === campaignId);
  return {
    campaign,
    creative: {
      headline: related?.headline ?? "",
      body: related?.body ?? "",
      cta: related?.cta ?? "",
      image: related?.image_url ?? null,
      video: related?.video_url ?? null,
    },
    metrics: [
      {
        label: campaign.campaign_name,
        ctr: campaign.ctr,
        cvr: campaign.cvr,
        cpc: campaign.cpc,
        spend: campaign.spend,
      },
    ],
    problems: [] as string[],
    suggestions: [] as string[],
    alignment: 0,
    riskLevel: "Low" as const,
  };
}

function sum(items: TwitterAd[], key: keyof TwitterAd) {
  return items.reduce((total, item) => total + Number(item[key] ?? 0), 0);
}

function average(items: TwitterAd[], key: keyof TwitterAd) {
  const values = items.map((item) => Number(item[key] ?? 0)).filter((value) => Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0) / values.length) : 0;
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function slugId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "unassigned";
}

function latestAnalyzedAt(items: TwitterAd[]) {
  const latest = items.map((item) => item.updated_at ?? item.created_at).filter(Boolean).sort().at(-1);
  return latest ? new Date(latest).toLocaleString() : "-";
}
