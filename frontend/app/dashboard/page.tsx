"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, Lightbulb, LineChart, Target } from "lucide-react";

import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdLpPairs } from "@/hooks/use-ad-lp-pairs";
import { useDemandIntelligenceDashboard, useOutcomesDashboard } from "@/hooks/useAdflowData";
import { useLandingPages } from "@/hooks/use-landing-pages";
import { useProjects } from "@/hooks/use-projects";
import { useTwitterAds } from "@/hooks/use-twitter-ads";

export default function DashboardPage() {
  const projects = useProjects();
  const ads = useTwitterAds();
  const landingPages = useLandingPages();
  const pairs = useAdLpPairs();
  const demand = useDemandIntelligenceDashboard();
  const outcomes = useOutcomesDashboard();

  const isLoading = projects.isLoading || ads.isLoading || landingPages.isLoading || pairs.isLoading || demand.isLoading || outcomes.isLoading;
  const isError = projects.isError || ads.isError || landingPages.isError || pairs.isError || demand.isError || outcomes.isError;

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState />;

  const projectCount = projects.data?.length ?? 0;
  const adCount = ads.data?.length ?? 0;
  const lpCount = landingPages.data?.length ?? 0;
  const pairCount = pairs.data?.length ?? 0;
  const analyzedCount = pairs.data?.filter((pair) => pair.last_analyzed_at).length ?? 0;
  const demandCount = demand.data?.length ?? 0;
  const outcomeCount = outcomes.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dashboard"
        description="最初に使う機能を選び、次に進むべき作業を確認します。"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ModeCard
          body="広告とLPをセットで分析し、改善提案、実装タスク、結果記録まで進めます。"
          cta="広告とLPを改善する"
          href="/ad-optimization"
          icon={<Target className="h-6 w-6" />}
          title="Ad Optimization"
        />
        <ModeCard
          body="アプリ案やサービス案をチャットで相談し、需要、競合、市場ギャップ、方向性を整理します。"
          cta="アイデアを相談する"
          href="/demand-discovery"
          icon={<Lightbulb className="h-6 w-6" />}
          title="Demand Discovery"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Setup Progress</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-5">
            <Step done={projectCount > 0} label="Project" />
            <Step done={adCount > 0} label="Ad" />
            <Step done={lpCount > 0} label="LP" />
            <Step done={pairCount > 0} label="Analysis Target" />
            <Step done={analyzedCount > 0} label="Analysis" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ResultRow label="Demand Discovery runs" value={demandCount} />
            <ResultRow label="Recorded optimization results" value={outcomeCount} />
            <Button asChild className="w-full" variant="outline">
              <Link href="/results">
                <LineChart className="mr-2 h-4 w-4" />
                Open Results
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next Recommended Action</CardTitle>
        </CardHeader>
        <CardContent>
          <NextAction
            adCount={adCount}
            analyzedCount={analyzedCount}
            lpCount={lpCount}
            pairCount={pairCount}
            projectCount={projectCount}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ModeCard({
  body,
  cta,
  href,
  icon,
  title,
}: {
  body: string;
  cta: string;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-md bg-primary/10 p-3 text-primary">{icon}</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
          <Button asChild className="mt-5">
            <Link href={href}>
              {cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="rounded-md border border-border p-3 text-sm">
      <div className="flex items-center gap-2">
        {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <span className="h-4 w-4 rounded-full border border-border" />}
        <span className="font-medium">{label}</span>
      </div>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}

function NextAction({
  adCount,
  analyzedCount,
  lpCount,
  pairCount,
  projectCount,
}: {
  adCount: number;
  analyzedCount: number;
  lpCount: number;
  pairCount: number;
  projectCount: number;
}) {
  if (!projectCount) return <Action href="/ad-optimization" label="Create Project" text="まずAd Optimizationでプロジェクトを作成してください。" />;
  if (!adCount) return <Action href="/ads/new" label="Add Ad" text="分析対象にする広告を登録してください。" />;
  if (!lpCount) return <Action href="/lps/new" label="Add LP" text="広告と比較するLPを登録してください。" />;
  if (!pairCount) return <Action href="/pairs/new" label="Create Analysis Target" text="広告とLPの組み合わせを作成してください。" />;
  if (!analyzedCount) return <Action href="/pairs" label="Run Analysis" text="作成済みの分析対象で分析を実行してください。" />;
  return <Action href="/results" label="Review Results" text="提案、実装状態、結果、履歴を確認してください。" />;
}

function Action({ href, label, text }: { href: string; label: string; text: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild>
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  );
}
