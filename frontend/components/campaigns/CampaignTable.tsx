"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Campaign } from "@/lib/schemas";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function CampaignTable({ campaigns }: { campaigns: Campaign[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      campaigns.filter((campaign) =>
        campaign.campaign_name.toLowerCase().includes(query.toLowerCase()),
      ),
    [campaigns, query],
  );

  return (
    <div className="space-y-4">
      <Input
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search campaigns"
        value={query}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Impressions</TableHead>
            <TableHead>Clicks</TableHead>
            <TableHead>CTR</TableHead>
            <TableHead>CPC</TableHead>
            <TableHead>CVR</TableHead>
            <TableHead>Spend</TableHead>
            <TableHead>Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((campaign) => (
            <TableRow key={campaign.campaign_id}>
              <TableCell>
                <Link className="font-semibold hover:text-primary" href={`/campaigns/${campaign.campaign_id}`}>
                  {campaign.campaign_name}
                </Link>
                <div className="text-xs text-muted-foreground">{campaign.lastAnalyzedAt}</div>
              </TableCell>
              <TableCell><Badge variant="secondary">{campaign.status}</Badge></TableCell>
              <TableCell>{formatNumber(campaign.impressions)}</TableCell>
              <TableCell>{formatNumber(campaign.clicks)}</TableCell>
              <TableCell>{campaign.ctr}%</TableCell>
              <TableCell>{formatCurrency(campaign.cpc)}</TableCell>
              <TableCell>{campaign.cvr}%</TableCell>
              <TableCell>{formatCurrency(campaign.spend)}</TableCell>
              <TableCell className={campaign.trend < 0 ? "text-destructive" : "text-emerald-600"}>
                {campaign.trend}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
