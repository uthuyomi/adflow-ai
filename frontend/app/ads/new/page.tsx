"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronDown, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AdForm, type AdFormValues } from "@/components/registered/AdForm";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/hooks/use-i18n";
import { useProjects } from "@/hooks/use-projects";
import { useTwitterAdMutations } from "@/hooks/use-twitter-ads";
import { useXAdsAccounts, useXAdsConnections, useXAdsMutations } from "@/hooks/use-x-ads";
import { showActionableError } from "@/lib/api/errors";

export default function NewAdPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projects = useProjects();
  const connections = useXAdsConnections();
  const accounts = useXAdsAccounts();
  const manualMutations = useTwitterAdMutations();
  const requestedProjectId = searchParams.get("project_id") ?? "";
  const [projectId, setProjectId] = useState(requestedProjectId);
  const [showManual, setShowManual] = useState(false);
  const xAdsMutations = useXAdsMutations(projectId || undefined);

  useEffect(() => {
    if (!projectId && requestedProjectId) setProjectId(requestedProjectId);
  }, [projectId, requestedProjectId]);

  useEffect(() => {
    const result = searchParams.get("x_ads");
    if (!result) return;
    if (result === "connected") toast.success(t("xAds.oauthConnected"));
    else if (result === "denied") toast.info(t("xAds.oauthDenied"));
    else toast.error(t("xAds.oauthFailed"));
    const next = new URLSearchParams(searchParams.toString());
    next.delete("x_ads");
    router.replace(`/ads/new${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
  }, [router, searchParams, t]);

  const activeConnectionIds = useMemo(
    () => new Set((connections.data ?? []).filter((item) => item.status === "active").map((item) => item.id)),
    [connections.data],
  );
  const activeAccounts = (accounts.data ?? []).filter((account) => activeConnectionIds.has(account.connection_id));
  const selectedProject = (projects.data ?? []).find((project) => project.id === projectId);

  async function connectWithX() {
    try {
      const returnPath = `/ads/new${projectId ? `?project_id=${encodeURIComponent(projectId)}` : ""}`;
      const result = await xAdsMutations.startOAuth.mutateAsync({ label: "X Ads", return_path: returnPath });
      window.location.assign(result.authorization_url);
    } catch (error) {
      showActionableError(error, t("xAds.operationFailed"), t("pricing.choosePlan"));
    }
  }

  async function syncAccount(connectionId: string, accountId: string) {
    if (!projectId) {
      toast.error(t("adsImport.projectRequired"));
      return;
    }
    try {
      const result = await xAdsMutations.sync.mutateAsync({
        connection_id: connectionId,
        account_id: accountId,
        days: 30,
      });
      toast.success(`${t("adsImport.syncCompleted")} ${result.synced_count}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("xAds.operationFailed"));
    }
  }

  async function submitManual(values: AdFormValues) {
    const clicks = values.clicks || 0;
    const impressions = values.impressions || 0;
    const conversions = values.conversions || 0;
    const spend = values.spend || 0;
    try {
      await manualMutations.create.mutateAsync({
        ...values,
        project_id: projectId || null,
        ctr: impressions ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
        cpc: clicks ? Number((spend / clicks).toFixed(2)) : 0,
        cvr: clicks ? Number(((conversions / clicks) * 100).toFixed(2)) : 0,
      });
      toast.success(t("adsImport.manualCreated"));
      router.push(projectId ? `/ad-optimization/${projectId}` : "/ads");
    } catch (error) {
      showActionableError(error, t("adsImport.manualCreateFailed"), t("pricing.choosePlan"));
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title={t("adsImport.title")} description={t("adsImport.description")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("adsImport.destinationProject")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("adsImport.destinationProjectDescription")}</p>
        </CardHeader>
        <CardContent>
          <select
            aria-label={t("adsImport.destinationProject")}
            className="h-10 w-full max-w-xl rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) => setProjectId(event.target.value)}
            value={projectId}
          >
            <option value="">{t("adsImport.selectProject")}</option>
            {(projects.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("adsImport.xAccountTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("adsImport.xAccountDescription")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {!connections.isLoading && !activeAccounts.length ? (
            <div className="flex flex-col gap-4 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{t("adsImport.connectTitle")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("adsImport.connectDescription")}</p>
              </div>
              <Button disabled={xAdsMutations.startOAuth.isPending} onClick={connectWithX} type="button">
                <ShieldCheck className="mr-2 h-4 w-4" />
                {t("xAds.connectWithX")}
              </Button>
            </div>
          ) : null}

          {activeAccounts.map((account) => (
            <div className="flex flex-col gap-4 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between" key={account.id}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{account.name}</p>
                  <Badge variant="secondary">{account.currency || t("xAds.currencyUnknown")}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {account.x_account_id} · {t("xAds.lastSync")} {account.last_synced_at ? new Date(account.last_synced_at).toLocaleString() : t("xAds.never")}
                </p>
              </div>
              <Button disabled={!projectId || xAdsMutations.sync.isPending} onClick={() => syncAccount(account.connection_id, account.x_account_id)} type="button">
                <RefreshCw className={`mr-2 h-4 w-4 ${xAdsMutations.sync.isPending ? "animate-spin" : ""}`} />
                {t("adsImport.syncIntoProject")} · 20 {t("pricing.credits")}
              </Button>
            </div>
          ))}

          {selectedProject && activeAccounts.length ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/60 p-3 text-sm">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{t("adsImport.readyToSync")} {selectedProject.name}</span>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/ad-optimization/${selectedProject.id}`}><ExternalLink className="mr-2 h-4 w-4" />{t("adsImport.openProject")}</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div>
        <Button className="px-0 text-muted-foreground" onClick={() => setShowManual((value) => !value)} type="button" variant="ghost">
          <ChevronDown className={`mr-2 h-4 w-4 transition-transform ${showManual ? "rotate-180" : ""}`} />
          {t("adsImport.manualTitle")}
        </Button>
        {showManual ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">{t("adsImport.manualDescription")}</p>
            <AdForm submitLabel={t("adsImport.createManual")} isPending={manualMutations.create.isPending} onSubmit={submitManual} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
