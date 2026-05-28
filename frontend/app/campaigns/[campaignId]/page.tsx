"use client";

import { useParams } from "next/navigation";

import { AdCreativePreview } from "@/components/campaigns/AdCreativePreview";
import { CampaignMetricCards } from "@/components/campaigns/CampaignMetricCards";
import { CampaignTrendChart } from "@/components/campaigns/CampaignTrendChart";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCampaign } from "@/hooks/useCampaigns";

export default function CampaignDetailPage() {
  const params = useParams<{ campaignId: string }>();
  const campaign = useCampaign(params.campaignId);
  if (campaign.isLoading) return <PageSkeleton />;
  if (campaign.isError || !campaign.data) return <ErrorState />;

  const data = campaign.data;
  return (
    <div className="space-y-6">
      <SectionHeader
        title={data.campaign.campaign_name}
        description="Review ad creative, metric trend, AI problems, suggestions, and LP alignment."
        action={<Badge variant="warning">{data.riskLevel} risk</Badge>}
      />
      <CampaignMetricCards campaign={data.campaign} />
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="suggestions">Ad Suggestions</TabsTrigger>
          <TabsTrigger value="alignment">LP Alignment</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <AdCreativePreview {...data.creative} />
            <CampaignTrendChart data={data.metrics} />
          </div>
        </TabsContent>
        <TabsContent value="metrics"><CampaignTrendChart data={data.metrics} /></TabsContent>
        <TabsContent value="suggestions">
          <Card><CardHeader><CardTitle>AI detected problems</CardTitle></CardHeader><CardContent className="space-y-3">{data.problems.map((item) => <div className="rounded-md border border-border p-4 text-sm" key={item}>{item}</div>)}{data.suggestions.map((item) => <div className="rounded-md bg-accent p-4 text-sm" key={item}>{item}</div>)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="alignment">
          <Card><CardHeader><CardTitle>LP alignment</CardTitle></CardHeader><CardContent><div className="mb-2 flex justify-between text-sm"><span>Hero similarity</span><span className="font-semibold">{data.alignment}%</span></div><Progress value={data.alignment} /></CardContent></Card>
        </TabsContent>
        <TabsContent value="history">
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Historical changes will appear here after multiple approved review cycles.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
