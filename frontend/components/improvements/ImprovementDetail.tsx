"use client";

import { CheckCircle2, GitPullRequest, XCircle } from "lucide-react";

import { ApprovalDialog } from "@/components/improvements/ApprovalDialog";
import { DiffViewer } from "@/components/improvements/DiffViewer";
import { ReviewWarnings } from "@/components/improvements/ReviewWarnings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Improvement } from "@/lib/schemas";
import { useUiStore } from "@/lib/store";

export function ImprovementDetail({ improvement }: { improvement: Improvement }) {
  const setMode = useUiStore((state) => state.setReviewDialogMode);
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
              <Button className="w-full" onClick={() => setMode("approve")}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button className="w-full" onClick={() => setMode("pr")} variant="secondary">
                <GitPullRequest className="mr-2 h-4 w-4" />
                Create PR
              </Button>
              <Button className="w-full" onClick={() => setMode("reject")} variant="outline">
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
      <ApprovalDialog improvementId={improvement.id} />
    </div>
  );
}
