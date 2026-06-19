"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Download, LinkIcon } from "lucide-react";
import { toast } from "sonner";

import { LpForm, type LpFormValues } from "@/components/registered/LpForm";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/hooks/use-i18n";
import { useLandingPageMutations } from "@/hooks/use-landing-pages";
import { useProjects } from "@/hooks/use-projects";
import { importLandingPageFromUrl } from "@/lib/api/product";
import { showActionableError } from "@/lib/api/errors";

export default function NewLpPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projects = useProjects();
  const mutations = useLandingPageMutations();
  const requestedProjectId = searchParams.get("project_id") ?? "";
  const [projectId, setProjectId] = useState(requestedProjectId);
  const [url, setUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    if (!projectId && requestedProjectId) setProjectId(requestedProjectId);
  }, [projectId, requestedProjectId]);

  const destination = projectId ? `/ad-optimization/${projectId}` : "/lps";

  const importFromUrl = async () => {
    if (!projectId) {
      toast.error(t("lpImport.projectRequired"));
      return;
    }
    setIsImporting(true);
    try {
      await importLandingPageFromUrl({ url, project_id: projectId });
      toast.success(t("lpImport.imported"));
      router.push(destination);
    } catch (error) {
      showActionableError(error, t("lpImport.importFailed"), t("pricing.choosePlan"));
    } finally {
      setIsImporting(false);
    }
  };

  const submit = async (values: LpFormValues) => {
    try {
      await mutations.create.mutateAsync({ ...values, project_id: projectId || null });
      toast.success(t("lpImport.manualCreated"));
      router.push(destination);
    } catch (error) {
      showActionableError(error, t("lpImport.manualCreateFailed"), t("pricing.choosePlan"));
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title={t("lpImport.title")} description={t("lpImport.description")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("lpImport.fromUrl")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("lpImport.fromUrlDescription")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t("adsImport.destinationProject")}</span>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" onChange={(event) => setProjectId(event.target.value)} value={projectId}>
                <option value="">{t("adsImport.selectProject")}</option>
                {(projects.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">URL</span>
              <Input onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" type="url" value={url} />
            </label>
          </div>
          <div className="flex justify-end">
            <Button disabled={!projectId || !url.trim() || isImporting} onClick={importFromUrl} type="button">
              {isImporting ? <Download className="mr-2 h-4 w-4 animate-pulse" /> : <LinkIcon className="mr-2 h-4 w-4" />}
              {t("lpImport.import")}
            </Button>
          </div>
        </CardContent>
      </Card>
      <div>
        <Button className="px-0 text-muted-foreground" onClick={() => setShowManual((value) => !value)} type="button" variant="ghost">
          <ChevronDown className={`mr-2 h-4 w-4 transition-transform ${showManual ? "rotate-180" : ""}`} />
          {t("lpImport.manualTitle")}
        </Button>
        {showManual ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">{t("lpImport.manualDescription")}</p>
            <LpForm submitLabel={t("lpImport.createManual")} isPending={mutations.create.isPending} onSubmit={submit} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
