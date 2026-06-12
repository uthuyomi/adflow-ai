"use client";

import { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useXAdsAccounts, useXAdsMutations } from "@/hooks/use-x-ads";
import { useI18n } from "@/hooks/use-i18n";
import type { AIAgentResult } from "@/lib/types/adflow";

export function XAdsPublishDraftDialog({
  result,
  open,
  onOpenChange,
}: {
  result: AIAgentResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const accounts = useXAdsAccounts();
  const { t } = useI18n();
  const mutations = useXAdsMutations(result?.project_id ?? undefined);
  const initialText = useMemo(() => {
    const output = result?.output as { recommendations?: string[]; suggested_value?: string; ad_copy?: string } | undefined;
    return output?.suggested_value || output?.ad_copy || output?.recommendations?.[0] || "";
  }, [result]);
  const [accountId, setAccountId] = useState("");
  const [lineItemId, setLineItemId] = useState("");
  const [text, setText] = useState("");
  const [hypothesis, setHypothesis] = useState("");

  useEffect(() => {
    setText(initialText);
    setHypothesis(String((result?.output as { summary?: string } | undefined)?.summary || ""));
  }, [initialText, result]);

  const account = accounts.data?.find((item) => item.id === accountId);
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{t("xAds.createDraft")}</DialogTitle>
          <DialogDescription>
            {t("xAds.createDraftDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5 space-y-4">
          {result ? (
            <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <span>{result.source_provider}</span>
              <Badge variant={result.provider_type === "REAL" ? "secondary" : "warning"}>
                {result.provider_type === "REAL" ? "実AI結果" : "モック結果"}
              </Badge>
            </div>
          ) : null}
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("xAds.account")}</span>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" onChange={(event) => setAccountId(event.target.value)} value={accountId}>
              <option value="">{t("xAds.selectAccount")}</option>
              {(accounts.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} ({item.x_account_id})</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("xAds.lineItemId")}</span>
            <Input onChange={(event) => setLineItemId(event.target.value)} placeholder={t("xAds.lineItemId")} value={lineItemId} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("xAds.approvedCopy")}</span>
            <Textarea className="min-h-32" maxLength={280} onChange={(event) => setText(event.target.value)} value={text} />
            <span className="block text-right text-xs text-muted-foreground">{text.length}/280</span>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("xAds.hypothesis")}</span>
            <Textarea onChange={(event) => setHypothesis(event.target.value)} value={hypothesis} />
          </label>
          <div className="flex justify-end">
            <Button
              disabled={!result || !account || !lineItemId.trim() || !text.trim() || mutations.createPublishRequest.isPending}
              onClick={async () => {
                if (!result || !account) return;
                try {
                  await mutations.createPublishRequest.mutateAsync({
                    source_ai_result_id: result.id,
                    connection_id: account.connection_id,
                    account_id: account.x_account_id,
                    line_item_id: lineItemId.trim(),
                    proposed_text: text.trim(),
                    hypothesis: hypothesis.trim() || null,
                  });
                  toast.success("X Ads publishing draft created. Review it in the project X Ads tab.");
                  onOpenChange(false);
                } catch (caught) {
                  toast.error(caught instanceof Error ? caught.message : "Draft creation failed.");
                }
              }}
              type="button"
            >
              <Send className="mr-2 h-4 w-4" />{t("xAds.createInertDraft")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
