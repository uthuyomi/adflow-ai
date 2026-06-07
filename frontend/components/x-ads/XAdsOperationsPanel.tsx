"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, KeyRound, RefreshCw, Send, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useXAdsAccounts, useXAdsConnections, useXAdsMutations, useXAdsPublishRequests } from "@/hooks/use-x-ads";
import { useI18n } from "@/hooks/use-i18n";

export function XAdsOperationsPanel({ projectId }: { projectId?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const connections = useXAdsConnections();
  const accounts = useXAdsAccounts();
  const publishRequests = useXAdsPublishRequests(projectId);
  const mutations = useXAdsMutations(projectId);
  const [label, setLabel] = useState("Production X Ads");
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [showManual, setShowManual] = useState(false);
  const activeConnectionIds = new Set((connections.data ?? []).filter((item) => item.status === "active").map((item) => item.id));
  const activeAccounts = (accounts.data ?? []).filter((item) => activeConnectionIds.has(item.connection_id));

  useEffect(() => {
    const result = searchParams.get("x_ads");
    if (!result) return;
    if (result === "connected") toast.success(t("xAds.oauthConnected"));
    else if (result === "denied") toast.info(t("xAds.oauthDenied"));
    else toast.error(t("xAds.oauthFailed"));
    router.replace(projectId ? `/ad-optimization/${projectId}` : "/ad-optimization", { scroll: false });
  }, [projectId, router, searchParams, t]);

  async function act(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      toast.success(success);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t("xAds.operationFailed"));
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />{t("xAds.connection")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("xAds.connectionDescription")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium">{t("xAds.oauthTitle")}</div>
              <p className="mt-1 text-sm text-muted-foreground">{t("xAds.oauthDescription")}</p>
            </div>
            <Button
              disabled={mutations.startOAuth.isPending}
              onClick={() => act(async () => {
                const result = await mutations.startOAuth.mutateAsync({
                  label: "X Ads",
                  return_path: projectId ? `/ad-optimization/${projectId}` : "/ad-optimization",
                });
                window.location.assign(result.authorization_url);
              }, t("xAds.oauthRedirecting"))}
              type="button"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />{t("xAds.connectWithX")}
            </Button>
          </div>
          <Button className="px-0 text-muted-foreground" onClick={() => setShowManual((value) => !value)} size="sm" type="button" variant="ghost">
            <ChevronDown className={`mr-2 h-4 w-4 transition-transform ${showManual ? "rotate-180" : ""}`} />
            {t("xAds.manualConnection")}
          </Button>
          {showManual ? (
            <div className="space-y-3 rounded-md border border-border p-4">
              <p className="text-sm text-muted-foreground">{t("xAds.manualConnectionDescription")}</p>
              <div className="grid gap-3 lg:grid-cols-3">
                <Input aria-label={t("xAds.connectionLabel")} onChange={(event) => setLabel(event.target.value)} placeholder={t("xAds.connectionLabel")} value={label} />
                <Input aria-label={t("xAds.accessToken")} autoComplete="off" onChange={(event) => setToken(event.target.value)} placeholder={t("xAds.accessToken")} type="password" value={token} />
                <Input aria-label={t("xAds.accessTokenSecret")} autoComplete="off" onChange={(event) => setSecret(event.target.value)} placeholder={t("xAds.accessTokenSecret")} type="password" value={secret} />
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={mutations.connect.isPending || !label.trim() || !token.trim() || !secret.trim()}
                  onClick={() => act(async () => {
                    await mutations.connect.mutateAsync({ label, access_token: token, access_token_secret: secret });
                    setToken("");
                    setSecret("");
                  }, t("xAds.manualConnected"))}
                  type="button"
                  variant="outline"
                >
                  <KeyRound className="mr-2 h-4 w-4" />{t("xAds.connectVerify")}
                </Button>
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            {(connections.data ?? []).map((connection) => (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3" key={connection.id}>
                <div>
                  <div className="font-medium">{connection.label}</div>
                  <div className="text-sm text-muted-foreground">{connection.last_error || `${t("xAds.lastVerified")}: ${connection.last_verified_at ? new Date(connection.last_verified_at).toLocaleString() : t("xAds.notYet")}`}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={connection.status === "active" ? "secondary" : "warning"}>{connection.status}</Badge>
                  <Button onClick={() => act(() => mutations.verify.mutateAsync(connection.id), t("xAds.verified"))} size="sm" type="button" variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />{t("xAds.verify")}
                  </Button>
                  {connection.status !== "revoked" ? (
                    <Button onClick={() => act(() => mutations.revoke.mutateAsync(connection.id), t("xAds.revoked"))} size="sm" type="button" variant="outline">
                      <X className="mr-2 h-4 w-4" />{t("xAds.revoke")}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("xAds.accountsMetrics")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("xAds.accountsMetricsDescription")}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeAccounts.map((account) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3" key={account.id}>
              <div>
                <div className="font-medium">{account.name}</div>
                <div className="text-sm text-muted-foreground">{account.x_account_id} / {account.currency || t("xAds.currencyUnknown")} / {t("xAds.lastSync")} {account.last_synced_at ? new Date(account.last_synced_at).toLocaleString() : t("xAds.never")}</div>
              </div>
              <Button onClick={() => act(() => mutations.sync.mutateAsync({ connection_id: account.connection_id, account_id: account.x_account_id, days: 30 }), t("xAds.synced"))} size="sm" type="button">
                <RefreshCw className={`mr-2 h-4 w-4 ${mutations.sync.isPending ? "animate-spin" : ""}`} />{t("xAds.sync30Days")}
              </Button>
            </div>
          ))}
          {!accounts.isLoading && !activeAccounts.length ? <p className="text-sm text-muted-foreground">{t("xAds.noAccounts")}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("xAds.approvalQueue")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("xAds.approvalQueueDescription")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {(publishRequests.data ?? []).map((request) => (
            <div className="space-y-3 rounded-md border border-border p-4" key={request.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="max-w-2xl whitespace-pre-wrap text-sm">{request.proposed_text}</p>
                <div className="flex gap-2"><Badge>{request.approval_status}</Badge><Badge variant="outline">{request.publish_status}</Badge></div>
              </div>
              {request.error_message ? <p className="text-sm text-destructive">{request.error_message}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                {request.approval_status === "draft" ? <>
                  <Button onClick={() => act(() => mutations.approve.mutateAsync({ requestId: request.id, approved: false }), t("xAds.draftRejected"))} size="sm" type="button" variant="outline"><X className="mr-2 h-4 w-4" />{t("xAds.reject")}</Button>
                  <Button onClick={() => act(() => mutations.approve.mutateAsync({ requestId: request.id, approved: true }), t("xAds.draftApproved"))} size="sm" type="button"><Check className="mr-2 h-4 w-4" />{t("xAds.approve")}</Button>
                </> : null}
                {request.approval_status === "approved" && request.publish_status !== "published" ? (
                  <Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => act(() => mutations.publish.mutateAsync(request.id), t("xAds.published"))} size="sm" type="button"><Send className="mr-2 h-4 w-4" />{t("xAds.publish")}</Button>
                ) : null}
              </div>
            </div>
          ))}
          {!publishRequests.isLoading && !(publishRequests.data ?? []).length ? <p className="text-sm text-muted-foreground">{t("xAds.noDrafts")}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
