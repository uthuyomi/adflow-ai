"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BarChart3, CheckCircle2, Layers3, Plus, Target } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdLpPairs } from "@/hooks/use-ad-lp-pairs";
import { useI18n } from "@/hooks/use-i18n";
import { useOutcomesDashboard } from "@/hooks/useAdflowData";
import { useLandingPages } from "@/hooks/use-landing-pages";
import { useProjects } from "@/hooks/use-projects";
import { useTwitterAds } from "@/hooks/use-twitter-ads";
import type { AdProject } from "@/lib/types/adflow";

export default function AdOptimizationPage() {
  const { t } = useI18n();
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
