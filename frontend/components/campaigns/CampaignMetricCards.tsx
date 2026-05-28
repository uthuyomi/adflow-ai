import { MousePointerClick, ReceiptText, TrendingDown, Users } from "lucide-react";

import { KpiCard } from "@/components/dashboard/KpiCard";
import type { Campaign } from "@/lib/schemas";
import { formatCurrency } from "@/lib/utils";

export function CampaignMetricCards({ campaign }: { campaign: Campaign }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard icon={<Users className="h-5 w-5" />} label="Impressions" value={campaign.impressions} />
      <KpiCard icon={<MousePointerClick className="h-5 w-5" />} label="Clicks" value={campaign.clicks} />
      <KpiCard icon={<TrendingDown className="h-5 w-5" />} label="CTR" value={`${campaign.ctr}%`} delta={`${campaign.trend}% trend`} tone="bad" />
      <KpiCard icon={<ReceiptText className="h-5 w-5" />} label="Spend" value={formatCurrency(campaign.spend)} />
    </div>
  );
}
