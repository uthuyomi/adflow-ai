"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { Activity, FileText, Megaphone, Play, Plus, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdLpPairs } from "@/hooks/use-ad-lp-pairs";
import { useOutcomesDashboard } from "@/hooks/useAdflowData";
import { useChangeHistory } from "@/hooks/use-change-history";
import { useLandingPages } from "@/hooks/use-landing-pages";
import { useProject } from "@/hooks/use-projects";
import { useTwitterAds } from "@/hooks/use-twitter-ads";

export default function AdOptimizationProjectPage() {
  const params = useParams<{ projectId: string }>();
  const project = useProject(params.projectId);
  const ads = useTwitterAds();
  const lps = useLandingPages();
  const pairs = useAdLpPairs();
  const outcomes = useOutcomesDashboard();
  const history = useChangeHistory();

  const isLoading = project.isLoading || ads.isLoading || lps.isLoading || pairs.isLoading || outcomes.isLoading || history.isLoading;
  const isError = project.isError || ads.isError || lps.isError || pairs.isError || outcomes.isError || history.isError;

  if (isLoading) return <PageSkeleton />;
  if (isError || !project.data) return <ErrorState />;

  const projectAds = (ads.data ?? []).filter((ad) => ad.project_id === params.projectId);
  const projectLps = (lps.data ?? []).filter((lp) => lp.project_id === params.projectId);
  const projectPairs = (pairs.data ?? []).filter((pair) => pair.project_id === params.projectId);
  const projectOutcomes = (outcomes.data ?? []).filter((outcome) => outcome.project_id === params.projectId);
  const projectHistory = (history.data ?? []).filter((item) => item.project_id === params.projectId);
  const analyzedCount = projectPairs.filter((pair) => pair.last_analyzed_at).length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={project.data.name}
        description={project.data.description || "広告、LP、分析、提案、結果をこのプロジェクトで管理します。"}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/ads/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Ad
              </Link>
            </Button>
            <Button asChild>
              <Link href="/pairs/new">
                <Play className="mr-2 h-4 w-4" />
                New Analysis
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Ads" value={projectAds.length} />
        <Metric label="Landing Pages" value={projectLps.length} />
        <Metric label="Analysis Targets" value={projectPairs.length} />
        <Metric label="Recorded Results" value={projectOutcomes.length} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Next Recommended Action</CardTitle>
            </CardHeader>
            <CardContent>
              <NextAction ads={projectAds.length} analyzed={analyzedCount} lps={projectLps.length} pairs={projectPairs.length} />
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard icon={<Megaphone className="h-5 w-5" />} label="Registered ads" value={projectAds.length} />
            <SummaryCard icon={<FileText className="h-5 w-5" />} label="Registered LPs" value={projectLps.length} />
            <SummaryCard icon={<Sparkles className="h-5 w-5" />} label="Latest results" value={projectOutcomes.length} />
          </div>
        </TabsContent>

        <TabsContent value="assets">
          <div className="grid gap-4 lg:grid-cols-2">
            <AssetList
              emptyAction="/ads/new"
              emptyLabel="Add Ad"
              emptyText="広告を登録すると、このプロジェクトの分析対象にできます。"
              items={projectAds.map((ad) => ({
                href: `/ads/${ad.id}/edit`,
                title: ad.name,
                meta: ad.headline || ad.destination_url,
                badge: ad.status,
              }))}
              title="Ads"
            />
            <AssetList
              emptyAction="/lps/new"
              emptyLabel="Add LP"
              emptyText="LPを登録すると、広告との整合性を分析できます。"
              items={projectLps.map((lp) => ({
                href: `/lps/${lp.id}/edit`,
                title: lp.name,
                meta: lp.hero_title || lp.url,
                badge: lp.primary_cta || "No CTA",
              }))}
              title="Landing Pages"
            />
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          {projectPairs.length ? (
            <div className="space-y-3">
              {projectPairs.map((pair) => (
                <Link className="block rounded-md border border-border p-4 hover:bg-accent" href={`/pairs/${pair.id}`} key={pair.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{pair.name}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {pair.twitter_ads?.name || "Ad"} / {pair.landing_pages?.name || "Landing Page"}
                      </div>
                    </div>
                    <Badge variant={pair.last_analyzed_at ? "secondary" : "outline"}>
                      {pair.last_analyzed_at ? "Analyzed" : "Not analyzed"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <EmptyState
                title="No analysis target"
                description="広告とLPの組み合わせを作成すると、整合性分析を実行できます。"
              />
              <div className="flex justify-center">
                <Button asChild>
                  <Link href="/pairs/new">Create Analysis Target</Link>
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recommendations">
          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">Recommendations</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  分析から生成された改善提案は、ここではユーザー向けに Recommendations として扱います。
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/improvements">Open Recommendations</Link>
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          {projectOutcomes.length ? (
            <div className="space-y-3">
              {projectOutcomes.map((outcome) => (
                <Card className="p-4" key={outcome.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{outcome.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{outcome.outcome_summary || outcome.description || "No summary"}</div>
                    </div>
                    <Badge>{outcome.outcome_status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No results" description="改善を実装したら、before / after metrics を記録します。" />
          )}
        </TabsContent>

        <TabsContent value="activity">
          {projectHistory.length ? (
            <div className="space-y-3">
              {projectHistory.slice(0, 20).map((item) => (
                <Card className="p-4" key={item.id}>
                  <div className="flex gap-3">
                    <Activity className="mt-1 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{item.summary || `${item.entity_type} ${item.action}`}</div>
                      <div className="text-sm text-muted-foreground">{new Date(item.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No activity" description="変更、分析、判断、結果記録がここに表示されます。" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </Card>
  );
}

function NextAction({ ads, analyzed, lps, pairs }: { ads: number; analyzed: number; lps: number; pairs: number }) {
  if (!ads) return <ActionText href="/ads/new" label="Add Ad" text="まず広告を登録してください。" />;
  if (!lps) return <ActionText href="/lps/new" label="Add LP" text="次にLPを登録してください。" />;
  if (!pairs) return <ActionText href="/pairs/new" label="Create Analysis Target" text="広告とLPの組み合わせを作成してください。" />;
  if (!analyzed) return <ActionText href="/pairs" label="Run Analysis" text="作成済みの分析対象で分析を実行してください。" />;
  return <ActionText href="/results" label="Review Results" text="改善提案と結果を確認してください。" />;
}

function ActionText({ href, label, text }: { href: string; label: string; text: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild>
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </div>
    </Card>
  );
}

function AssetList({
  emptyAction,
  emptyLabel,
  emptyText,
  items,
  title,
}: {
  emptyAction: string;
  emptyLabel: string;
  emptyText: string;
  items: Array<{ href: string; title: string; meta: string; badge: string }>;
  title: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href={emptyAction}>{emptyLabel}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <Link className="block rounded-md border border-border p-3 hover:bg-accent" href={item.href} key={item.href}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-muted-foreground">{item.meta}</div>
                  </div>
                  <Badge variant="outline">{item.badge}</Badge>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <EmptyState
              title={`No ${title}`}
              description={emptyText}
            />
            <div className="flex justify-center">
              <Button asChild>
                <Link href={emptyAction}>{emptyLabel}</Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
