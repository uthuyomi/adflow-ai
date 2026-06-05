"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, BarChart3, CheckCircle2, Download, Layers3, LinkIcon, Plus, RefreshCw, Target } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdLpPairs } from "@/hooks/use-ad-lp-pairs";
import { useI18n } from "@/hooks/use-i18n";
import { useOutcomesDashboard } from "@/hooks/useAdflowData";
import { useLandingPages } from "@/hooks/use-landing-pages";
import { useProjects } from "@/hooks/use-projects";
import { useTwitterAds } from "@/hooks/use-twitter-ads";
import { importAdsCsv, importLandingPageFromUrl, syncXAds, type AssetImportSummary } from "@/lib/api/product";
import type { AdProject } from "@/lib/types/adflow";

export default function AdOptimizationPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const projects = useProjects();
  const ads = useTwitterAds();
  const lps = useLandingPages();
  const pairs = useAdLpPairs();
  const outcomes = useOutcomesDashboard();

  const isLoading = projects.isLoading || ads.isLoading || lps.isLoading || pairs.isLoading || outcomes.isLoading;
  const isError = projects.isError || ads.isError || lps.isError || pairs.isError || outcomes.isError;

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState />;

  const projectList = projects.data ?? [];
  const adList = ads.data ?? [];
  const lpList = lps.data ?? [];
  const pairList = pairs.data ?? [];
  const outcomeList = outcomes.data ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t("adOptimization.title")}
        description={t("adOptimization.description")}
        action={
          <Button asChild>
            <Link href="/projects">
              <Plus className="mr-2 h-4 w-4" />
              {t("adOptimization.createProject")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label={t("adOptimization.projects")} value={projectList.length} />
        <MetricCard label={t("adOptimization.ads")} value={adList.length} />
        <MetricCard label={t("adOptimization.landingPages")} value={lpList.length} />
        <MetricCard label={t("adOptimization.analysisTargets")} value={pairList.length} />
      </div>

      <AssetImportPanel
        projects={projectList}
        onImported={async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["twitter-ads"] }),
            queryClient.invalidateQueries({ queryKey: ["landing-pages"] }),
            queryClient.invalidateQueries({ queryKey: ["ad-lp-pairs"] }),
          ]);
        }}
      />

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{t("adOptimization.projects")}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{t("adOptimization.projectListDescription")}</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/projects">{t("adOptimization.manage")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {projectList.length ? (
              <div className="space-y-3">
                {projectList.slice(0, 6).map((project) => (
                  <ProjectRow
                    ads={adList.filter((ad) => ad.project_id === project.id).length}
                    labels={{
                      ads: t("adOptimization.adsShort"),
                      lps: t("adOptimization.lpsShort"),
                      noDescription: t("adOptimization.noDescription"),
                      results: t("adOptimization.resultsShort"),
                      targets: t("adOptimization.targetsShort"),
                    }}
                    lps={lpList.filter((lp) => lp.project_id === project.id).length}
                    outcomes={outcomeList.filter((outcome) => outcome.project_id === project.id).length}
                    pairs={pairList.filter((pair) => pair.project_id === project.id).length}
                    project={project}
                    key={project.id}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <EmptyState title={t("adOptimization.emptyTitle")} description={t("adOptimization.emptyDescription")} />
                <div className="flex justify-center">
                  <Button asChild>
                    <Link href="/projects">{t("adOptimization.createProject")}</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("adOptimization.gettingStarted")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Step done={projectList.length > 0} label={t("adOptimization.stepProject")} href="/projects" />
            <Step done={adList.length > 0} label={t("adOptimization.stepAd")} href="/ads/new" />
            <Step done={lpList.length > 0} label={t("adOptimization.stepLp")} href="/lps/new" />
            <Step done={pairList.length > 0} label={t("adOptimization.stepTarget")} href="/pairs/new" />
            <Step done={pairList.some((pair) => pair.last_analyzed_at)} label={t("adOptimization.stepAnalysis")} href="/pairs" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <QuickLink
          description={t("adOptimization.assetsDescription")}
          icon={<Layers3 className="h-5 w-5" />}
          links={[
            { href: "/ads", label: t("adOptimization.ads") },
            { href: "/lps", label: t("adOptimization.landingPages") },
          ]}
          title={t("adOptimization.assets")}
        />
        <QuickLink
          description={t("adOptimization.analysisDescription")}
          icon={<Target className="h-5 w-5" />}
          links={[
            { href: "/pairs", label: t("adOptimization.analysisTargets") },
            { href: "/improvements", label: t("adOptimization.recommendations") },
          ]}
          title={t("adOptimization.analysis")}
        />
        <QuickLink
          description={t("adOptimization.resultsDescription")}
          icon={<BarChart3 className="h-5 w-5" />}
          links={[
            { href: "/results", label: t("nav.results") },
            { href: "/history", label: t("adOptimization.activity") },
          ]}
          title={t("nav.results")}
        />
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </Card>
  );
}

function AssetImportPanel({
  projects,
  onImported,
}: {
  projects: AdProject[];
  onImported: () => Promise<void>;
}) {
  const [projectId, setProjectId] = useState("");
  const [lpUrl, setLpUrl] = useState("");
  const [csvText, setCsvText] = useState(sampleCsv);
  const [xAccountId, setXAccountId] = useState("");
  const [isPending, setIsPending] = useState<"lp" | "csv" | "x" | null>(null);
  const [lastResult, setLastResult] = useState<AssetImportSummary | null>(null);

  const selectedProjectId = projectId || null;

  async function runImport(kind: "lp" | "csv" | "x") {
    setIsPending(kind);
    try {
      const result =
        kind === "lp"
          ? await importLandingPageFromUrl({ url: lpUrl, project_id: selectedProjectId })
          : kind === "csv"
            ? await importAdsCsv({
                csv_text: csvText,
                project_id: selectedProjectId,
                auto_fetch_lps: true,
                auto_pair: true,
              })
            : await syncXAds({
                account_id: xAccountId,
                project_id: selectedProjectId,
                auto_fetch_lps: true,
                auto_pair: true,
              });
      setLastResult(result);
      await onImported();
      toast.success("Import completed.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Import failed.");
    } finally {
      setIsPending(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Import ads and landing pages</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Fetch LP content from a URL, import ad CSV rows, and automatically create ad-LP pairs.
            </p>
          </div>
          <Badge variant="secondary">X Ads only, Google later</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Project</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">No project / use row project_id</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="space-y-1 text-sm">
              <span className="font-medium">LP URL</span>
              <Input
                value={lpUrl}
                onChange={(event) => setLpUrl(event.target.value)}
                placeholder="https://example.com/landing-page"
              />
            </label>
            <Button
              className="self-end"
              disabled={isPending !== null || !lpUrl.trim()}
              onClick={() => runImport("lp")}
              type="button"
              variant="outline"
            >
              {isPending === "lp" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
              Fetch LP
            </Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Ad CSV</span>
            <Textarea
              className="min-h-32 font-mono text-xs"
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
            />
          </label>
          <Button
            className="self-end"
            disabled={isPending !== null || !csvText.trim()}
            onClick={() => runImport("csv")}
            type="button"
          >
            {isPending === "csv" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Import CSV and pair
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="space-y-1 text-sm">
            <span className="font-medium">X Ads account ID</span>
            <Input
              value={xAccountId}
              onChange={(event) => setXAccountId(event.target.value)}
              placeholder="18ce54d4x5t"
            />
          </label>
          <Button
            className="self-end"
            disabled={isPending !== null || !xAccountId.trim()}
            onClick={() => runImport("x")}
            type="button"
            variant="outline"
          >
            {isPending === "x" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync X Ads
          </Button>
        </div>

        {lastResult ? <ImportResult result={lastResult} /> : null}
      </CardContent>
    </Card>
  );
}

function ImportResult({ result }: { result: AssetImportSummary }) {
  const summary = result.summary;
  return (
    <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm sm:grid-cols-4">
      <div>
        <div className="text-muted-foreground">Ads</div>
        <div className="font-semibold">{summary?.ads ?? (result.landing_page ? 0 : "-")}</div>
      </div>
      <div>
        <div className="text-muted-foreground">LPs</div>
        <div className="font-semibold">{summary?.landing_pages ?? (result.landing_page ? 1 : "-")}</div>
      </div>
      <div>
        <div className="text-muted-foreground">Pairs</div>
        <div className="font-semibold">{summary?.pairs ?? "-"}</div>
      </div>
      <div>
        <div className="text-muted-foreground">Errors</div>
        <div className="font-semibold">{summary?.errors ?? result.errors?.length ?? 0}</div>
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  ads,
  lps,
  pairs,
  outcomes,
  labels,
}: {
  project: AdProject;
  ads: number;
  lps: number;
  pairs: number;
  outcomes: number;
  labels: {
    noDescription: string;
    ads: string;
    lps: string;
    targets: string;
    results: string;
  };
}) {
  return (
    <Link
      className="flex flex-col gap-3 rounded-md border border-border p-4 transition-colors hover:bg-accent sm:flex-row sm:items-center sm:justify-between"
      href={`/ad-optimization/${project.id}`}
    >
      <div>
        <div className="font-medium">{project.name}</div>
        <div className="mt-1 text-sm text-muted-foreground">{project.description || labels.noDescription}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {ads} {labels.ads}
        </Badge>
        <Badge variant="secondary">
          {lps} {labels.lps}
        </Badge>
        <Badge variant="secondary">
          {pairs} {labels.targets}
        </Badge>
        <Badge variant="outline">
          {outcomes} {labels.results}
        </Badge>
      </div>
    </Link>
  );
}

const sampleCsv = `name,campaign_name,headline,body,cta,destination_url,impressions,clicks,conversions,spend,status
Meeting AI Ad A,launch-test,AIで議事録を自動整理,録音から要点とTODOを自動作成します,無料で試す,https://example.com,10000,300,12,15000,active`;

function Step({ done, href, label }: { done: boolean; href: string; label: string }) {
  return (
    <Link className="flex items-center justify-between rounded-md border border-border p-3 text-sm hover:bg-accent" href={href}>
      <span className="flex items-center gap-2">
        {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <span className="h-4 w-4 rounded-full border border-border" />}
        {label}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function QuickLink({
  description,
  icon,
  links,
  title,
}: {
  description: string;
  icon: ReactNode;
  links: Array<{ href: string; label: string }>;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
          <CardTitle>{title}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Button asChild key={link.href} size="sm" variant="outline">
            <Link href={link.href}>{link.label}</Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
