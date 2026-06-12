"use client";

import { CheckCircle2, GitPullRequest, XCircle } from "lucide-react";

import { ApprovalDialog } from "@/components/improvements/ApprovalDialog";
import { GitHubPrPanel } from "@/components/improvements/GitHubPrPanel";
import { DiffViewer } from "@/components/improvements/DiffViewer";
import { ReviewWarnings } from "@/components/improvements/ReviewWarnings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useImprovementHistory } from "@/hooks/useImprovement";
import type { Improvement } from "@/lib/schemas";
import { useUiStore } from "@/lib/store";

export function ImprovementDetail({ improvement }: { improvement: Improvement }) {
  const setMode = useUiStore((state) => state.setReviewDialogMode);
  const history = useImprovementHistory(improvement.id);
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <DiffViewer improvement={improvement} />
        <ReviewWarnings improvement={improvement} />
      </div>
      <aside className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Approval summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-semibold">{improvement.confidence}%</span>
              </div>
              <Progress value={improvement.confidence} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">CTR impact</div>
                <div className="mt-1 text-lg font-semibold">+{improvement.expectedCtrImpact}%</div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">CVR impact</div>
                <div className="mt-1 text-lg font-semibold">+{improvement.expectedCvrImpact}%</div>
              </div>
            </div>
            <div className="space-y-2">
              <Badge variant="outline">{improvement.reviewStatus}</Badge>
              <Button className="w-full" disabled={improvement.reviewStatus !== "GENERATED"} onClick={() => setMode("approve")}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button className="w-full" disabled={improvement.reviewStatus !== "APPROVED"} onClick={() => setMode("pr")} variant="secondary">
                <GitPullRequest className="mr-2 h-4 w-4" />
                Mark Apply Ready
              </Button>
              <Button className="w-full" disabled={!["GENERATED", "APPROVED"].includes(improvement.reviewStatus)} onClick={() => setMode("reject")} variant="outline">
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button className="w-full" disabled={improvement.reviewStatus !== "APPLY_READY"} onClick={() => setMode("applied")}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark Applied
              </Button>
              <Button className="w-full" disabled={improvement.reviewStatus !== "APPLY_READY"} onClick={() => setMode("failed")} variant="outline">
                <XCircle className="mr-2 h-4 w-4" />
                Mark Failed
              </Button>
              <Button className="w-full" disabled={improvement.reviewStatus !== "FAILED"} onClick={() => setMode("pr")} variant="secondary">
                <GitPullRequest className="mr-2 h-4 w-4" />
                Retry Apply Ready
              </Button>
            </div>
          </CardContent>
        </Card>
        <GitHubPrPanel improvementId={improvement.id} enabled={improvement.reviewStatus === "APPLY_READY"} />
        <Card>
          <CardHeader><CardTitle>Status audit log</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(history.data ?? []).map((item) => (
              <div className="rounded-md border border-border p-3" key={item.id}>
                <div className="font-medium">{item.old_status ?? "CREATED"} → {item.new_status}</div>
                <div className="mt-1 text-xs text-muted-foreground">{new Date(item.changed_at).toLocaleString()}</div>
                {item.reason ? <div className="mt-2 text-xs">{item.reason}</div> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>
      <ApprovalDialog improvementId={improvement.id} currentStatus={improvement.reviewStatus} />
    </div>
  );
}
