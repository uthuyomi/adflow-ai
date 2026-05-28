"use client";

import { MetricsChart } from "@/components/dashboard/MetricsChart";

export function CampaignTrendChart({ data }: { data: Array<Record<string, number | string>> }) {
  return <MetricsChart data={data} />;
}
