"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Activity, FileText, FlaskConical, Megaphone, Play, Plus, Sparkles, Trophy } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { XAdsOperationsPanel } from "@/components/x-ads/XAdsOperationsPanel";
import { useAdABTestMutations, useAdABTests } from "@/hooks/use-ad-ab-tests";
import { useAdLpPairs } from "@/hooks/use-ad-lp-pairs";
import { useChangeHistory } from "@/hooks/use-change-history";
import { useI18n } from "@/hooks/use-i18n";
import { useLandingPages } from "@/hooks/use-landing-pages";
import { useProject } from "@/hooks/use-projects";
import { useTwitterAds } from "@/hooks/use-twitter-ads";
import { useOutcomesDashboard } from "@/hooks/useAdflowData";
import type { AdABTest } from "@/lib/api/product";
import type { TwitterAd } from "@/lib/types/adflow";

export default function AdOptimizationProjectPage() {
  const { t } = useI18n();
  const params = useParams<{ projectId: string }>();
  const project = useProject(params.projectId);
  const ads = useTwitterAds();
  const lps = useLandingPages();
  const pairs = useAdLpPairs();
  const outcomes = useOutcomesDashboard();
  const history = useChangeHistory();
  const abTests = useAdABTests(params.projectId);
  const abTestMutations = useAdABTestMutations(params.projectId);

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
        description={project.data.description || t("adOptimization.projectDetailFallback")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/ads/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("adOptimization.addAd")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/pairs/new">
                <Play className="mr-2 h-4 w-4" />
                {t("adOptimization.newAnalysis")}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label={t("adOptimization.ads")} value={projectAds.length} />
        <Metric label={t("adOptimization.landingPages")} value={projectLps.length} />
        <Metric label={t("adOptimization.analysisTargets")} value={projectPairs.length} />
        <Metric label={t("adOptimization.recordedResults")} value={projectOutcomes.length} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">{t("adOptimization.tabOverview")}</TabsTrigger>
          <TabsTrigger value="assets">{t("adOptimization.tabAssets")}</TabsTrigger>
          <TabsTrigger value="ab-tests">A/B Tests</TabsTrigger>
          <TabsTrigger value="x-ads">{t("xAds.tab")}</TabsTrigger>
          <TabsTrigger value="analysis">{t("adOptimization.tabAnalysis")}</TabsTrigger>
          <TabsTrigger value="recommendations">{t("adOptimization.tabRecommendations")}</TabsTrigger>
          <TabsTrigger value="results">{t("adOptimization.tabResults")}</TabsTrigger>
          <TabsTrigger value="activity">{t("adOptimization.tabActivity")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("adOptimization.nextAction")}</CardTitle>
            </CardHeader>
            <CardContent>
              <NextAction ads={projectAds.length} analyzed={analyzedCount} lps={projectLps.length} pairs={projectPairs.length} />
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard icon={<Megaphone className="h-5 w-5" />} label={t("adOptimization.registeredAds")} value={projectAds.length} />
            <SummaryCard icon={<FileText className="h-5 w-5" />} label={t("adOptimization.registeredLps")} value={projectLps.length} />
            <SummaryCard icon={<Sparkles className="h-5 w-5" />} label={t("adOptimization.latestResults")} value={projectOutcomes.length} />
          </div>
        </TabsContent>

        <TabsContent value="assets">
          <div className="grid gap-4 lg:grid-cols-2">
            <AssetList
              emptyAction="/ads/new"
              emptyLabel={t("adOptimization.addAd")}
              emptyText={t("adOptimization.emptyAds")}
              items={projectAds.map((ad) => ({
                href: `/ads/${ad.id}/edit`,
                title: ad.name,
                meta: ad.headline || ad.destination_url,
                badge: ad.status,
              }))}
              title={t("adOptimization.ads")}
            />
            <AssetList
              emptyAction="/lps/new"
              emptyLabel={t("adOptimization.addLp")}
              emptyText={t("adOptimization.emptyLps")}
              items={projectLps.map((lp) => ({
                href: `/lps/${lp.id}/edit`,
                title: lp.name,
                meta: lp.hero_title || lp.url,
                badge: lp.primary_cta || t("adOptimization.noCta"),
              }))}
              title={t("adOptimization.landingPages")}
            />
          </div>
        </TabsContent>

        <TabsContent value="ab-tests">
          <ABTestsPanel
            ads={projectAds}
            error={abTests.isError}
            isCreating={abTestMutations.create.isPending}
            isUpdating={abTestMutations.updateStatus.isPending}
            onCreate={async (payload) => {
              try {
                await abTestMutations.create.mutateAsync(payload);
                toast.success("A/B test created.");
              } catch (caught) {
                toast.error(caught instanceof Error ? caught.message : "A/B test creation failed.");
              }
            }}
            onStatus={async (testId, status) => {
              try {
                await abTestMutations.updateStatus.mutateAsync({ testId, status });
                toast.success("A/B test status updated.");
              } catch (caught) {
                toast.error(caught instanceof Error ? caught.message : "A/B test update failed.");
              }
            }}
            tests={abTests.data ?? []}
          />
        </TabsContent>

        <TabsContent value="x-ads">
          <XAdsOperationsPanel projectId={params.projectId} />
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
                        {pair.twitter_ads?.name || t("adOptimization.ad")} / {pair.landing_pages?.name || t("adOptimization.landingPage")}
                      </div>
                    </div>
                    <Badge variant={pair.last_analyzed_at ? "secondary" : "outline"}>
                      {pair.last_analyzed_at ? t("adOptimization.analyzed") : t("adOptimization.notAnalyzed")}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <EmptyState title={t("adOptimization.noAnalysisTarget")} description={t("adOptimization.noAnalysisTargetDescription")} />
              <div className="flex justify-center">
                <Button asChild>
                  <Link href="/pairs/new">{t("adOptimization.createAnalysisTarget")}</Link>
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recommendations">
          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">{t("adOptimization.recommendations")}</div>
                <p className="mt-1 text-sm text-muted-foreground">{t("adOptimization.recommendationsDescription")}</p>
              </div>
              <Button asChild variant="outline">
                <Link href="/improvements">{t("adOptimization.openRecommendations")}</Link>
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
                      <div className="mt-1 text-sm text-muted-foreground">{outcome.outcome_summary || outcome.description || t("adOptimization.noSummary")}</div>
                    </div>
                    <Badge>{outcome.outcome_status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title={t("adOptimization.noResults")} description={t("adOptimization.noResultsDescription")} />
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
            <EmptyState title={t("adOptimization.noActivity")} description={t("adOptimization.noActivityDescription")} />
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
  const { t } = useI18n();

  if (!ads) return <ActionText href="/ads/new" label={t("adOptimization.addAd")} text={t("adOptimization.nextAddAd")} />;
  if (!lps) return <ActionText href="/lps/new" label={t("adOptimization.addLp")} text={t("adOptimization.nextAddLp")} />;
  if (!pairs) return <ActionText href="/pairs/new" label={t("adOptimization.createAnalysisTarget")} text={t("adOptimization.nextCreateTarget")} />;
  if (!analyzed) return <ActionText href="/pairs" label={t("adOptimization.runAnalysis")} text={t("adOptimization.nextRunAnalysis")} />;
  return <ActionText href="/results" label={t("adOptimization.reviewResults")} text={t("adOptimization.nextReviewResults")} />;
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

function ABTestsPanel({
  ads,
  tests,
  error,
  isCreating,
  isUpdating,
  onCreate,
  onStatus,
}: {
  ads: TwitterAd[];
  tests: AdABTest[];
  error: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  onCreate: (payload: { name: string; hypothesis: string | null; primary_metric: "ctr" | "cvr" | "cpc"; ad_ids: string[] }) => Promise<void>;
  onStatus: (testId: string, status: AdABTest["status"]) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [metric, setMetric] = useState<"ctr" | "cvr" | "cpc">("ctr");
  const [selectedAds, setSelectedAds] = useState<string[]>([]);

  const toggleAd = (adId: string) => {
    setSelectedAds((current) => current.includes(adId) ? current.filter((id) => id !== adId) : [...current, adId]);
  };

  return (
    <div className="space-y-4">
      {error ? (
        <Card className="border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          A/B test storage is not available yet. Apply migration <code>202606060001_ad_ab_tests.sql</code> to Supabase.
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Create an ad A/B test</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select two or more ads from this project. Current registered metrics are used for a directional comparison.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Test name</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="LP promise angle test" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Primary metric</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={metric}
                onChange={(event) => setMetric(event.target.value as "ctr" | "cvr" | "cpc")}
              >
                <option value="ctr">CTR</option>
                <option value="cvr">CVR</option>
                <option value="cpc">CPC</option>
              </select>
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Hypothesis</span>
            <Textarea
              value={hypothesis}
              onChange={(event) => setHypothesis(event.target.value)}
              placeholder="A narrower promise will improve qualified clicks."
            />
          </label>
          <div className="grid gap-2 md:grid-cols-2">
            {ads.map((ad) => (
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-accent" key={ad.id}>
                <input
                  checked={selectedAds.includes(ad.id)}
                  className="mt-1 h-4 w-4"
                  onChange={() => toggleAd(ad.id)}
                  type="checkbox"
                />
                <span>
                  <span className="block font-medium">{ad.name}</span>
                  <span className="block text-sm text-muted-foreground">{ad.headline || ad.destination_url}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              disabled={error || isCreating || !name.trim() || selectedAds.length < 2}
              onClick={async () => {
                await onCreate({ name: name.trim(), hypothesis: hypothesis.trim() || null, primary_metric: metric, ad_ids: selectedAds });
                setName("");
                setHypothesis("");
                setSelectedAds([]);
              }}
              type="button"
            >
              <FlaskConical className="mr-2 h-4 w-4" />
              Create A/B test
            </Button>
          </div>
        </CardContent>
      </Card>

      {tests.length ? (
        tests.map((test) => <ABTestCard disabled={isUpdating} key={test.id} onStatus={onStatus} test={test} />)
      ) : (
        <EmptyState title="No A/B tests" description="Create a test after registering at least two ads in this project." />
      )}
    </div>
  );
}

function ABTestCard({
  test,
  disabled,
  onStatus,
}: {
  test: AdABTest;
  disabled: boolean;
  onStatus: (testId: string, status: AdABTest["status"]) => Promise<void>;
}) {
  const formatMetric = (value: number) => test.primary_metric === "cpc" ? value.toFixed(2) : `${value.toFixed(2)}%`;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{test.name}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{test.hypothesis || "No hypothesis recorded."}</p>
        </div>
        <Badge>{test.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {test.variants.map((variant) => (
            <div className="rounded-md border border-border p-4" key={variant.id}>
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">Variant {variant.label}</Badge>
                <span className="font-semibold">{test.primary_metric.toUpperCase()} {formatMetric(variant.metric_value)}</span>
              </div>
              <div className="mt-3 font-medium">{variant.ad?.name || "Missing ad"}</div>
              <div className="mt-1 text-sm text-muted-foreground">{variant.ad?.headline || "-"}</div>
            </div>
          ))}
        </div>
        {test.provisional_winner ? (
          <div className="flex items-start gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
            <Trophy className="mt-0.5 h-4 w-4 text-emerald-600" />
            <div>
              <div className="font-medium">Provisional winner: Variant {test.provisional_winner.label}</div>
              <div className="text-sm text-muted-foreground">{test.note}</div>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          {test.status === "draft" ? <Button disabled={disabled} onClick={() => onStatus(test.id, "running")} size="sm">Start test</Button> : null}
          {test.status === "running" ? <Button disabled={disabled} onClick={() => onStatus(test.id, "completed")} size="sm">Complete test</Button> : null}
          {test.status !== "archived" ? <Button disabled={disabled} onClick={() => onStatus(test.id, "archived")} size="sm" variant="outline">Archive</Button> : null}
        </div>
      </CardContent>
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
  const { t } = useI18n();

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
            <EmptyState title={`${t("adOptimization.no")} ${title}`} description={emptyText} />
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
