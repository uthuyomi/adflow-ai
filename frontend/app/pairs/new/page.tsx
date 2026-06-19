"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { PairForm, type PairFormValues } from "@/components/registered/PairForm";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdLpPairMutations } from "@/hooks/use-ad-lp-pairs";
import { useI18n } from "@/hooks/use-i18n";
import { useLandingPages } from "@/hooks/use-landing-pages";
import { useProjects } from "@/hooks/use-projects";
import { useTwitterAds } from "@/hooks/use-twitter-ads";
import { showActionableError } from "@/lib/api/errors";

export default function NewPairPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projects = useProjects();
  const ads = useTwitterAds();
  const lps = useLandingPages();
  const mutations = useAdLpPairMutations();
  const requestedProjectId = searchParams.get("project_id") ?? "";
  const [projectId, setProjectId] = useState(requestedProjectId);

  useEffect(() => {
    if (!projectId && requestedProjectId) setProjectId(requestedProjectId);
  }, [projectId, requestedProjectId]);

  const projectAds = projectId ? (ads.data ?? []).filter((ad) => ad.project_id === projectId) : [];
  const projectLps = projectId ? (lps.data ?? []).filter((lp) => lp.project_id === projectId) : [];

  const submit = async (values: PairFormValues) => {
    if (!projectId) {
      toast.error(t("pairCreate.projectRequired"));
      return;
    }
    try {
      await mutations.create.mutateAsync({ ...values, project_id: projectId });
      toast.success(t("pairCreate.created"));
      router.push(`/ad-optimization/${projectId}`);
    } catch (error) {
      showActionableError(error, t("pairCreate.createFailed"), t("pricing.choosePlan"));
    }
  };

  if (projects.isLoading || ads.isLoading || lps.isLoading) return <PageSkeleton />;
  if (projects.isError || ads.isError || lps.isError) return <ErrorState />;

  return (
    <div className="space-y-6">
      <SectionHeader title={t("pairCreate.title")} description={t("pairCreate.description")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("adsImport.destinationProject")}</CardTitle>
        </CardHeader>
        <CardContent>
          <select className="h-10 w-full max-w-xl rounded-md border border-input bg-background px-3 text-sm" onChange={(event) => setProjectId(event.target.value)} value={projectId}>
            <option value="">{t("adsImport.selectProject")}</option>
            {(projects.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </CardContent>
      </Card>
      {projectId && (!projectAds.length || !projectLps.length) ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">{t("pairCreate.assetsRequired")}</p>
          <div className="flex gap-2">
            {!projectAds.length ? <Button asChild size="sm" variant="outline"><Link href={`/ads/new?project_id=${projectId}`}><Plus className="mr-2 h-4 w-4" />{t("adOptimization.addAd")}</Link></Button> : null}
            {!projectLps.length ? <Button asChild size="sm" variant="outline"><Link href={`/lps/new?project_id=${projectId}`}><Plus className="mr-2 h-4 w-4" />{t("adOptimization.addLp")}</Link></Button> : null}
          </div>
        </Card>
      ) : null}
      <PairForm ads={projectAds} lps={projectLps} submitLabel={t("pairCreate.create")} isPending={mutations.create.isPending} onSubmit={submit} />
    </div>
  );
}
