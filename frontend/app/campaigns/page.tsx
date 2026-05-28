"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { CampaignTable } from "@/components/campaigns/CampaignTable";
import { useCampaigns } from "@/hooks/useCampaigns";

export default function CampaignsPage() {
  const campaigns = useCampaigns();
  if (campaigns.isLoading) return <PageSkeleton />;
  if (campaigns.isError) return <ErrorState />;
  const campaignItems = campaigns.data ?? [];
  return (
    <div className="space-y-6">
      <SectionHeader title="Campaigns" description="Scan campaign health, trend, spend, and last analysis state." />
      {campaignItems.length ? (
        <CampaignTable campaigns={campaignItems} />
      ) : (
        <EmptyState title="No campaigns" description="Connect an ad source or run analysis to populate campaigns." />
      )}
    </div>
  );
}
