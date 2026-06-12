"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useTransitionImprovement } from "@/hooks/useImprovement";
import { useUiStore } from "@/lib/store";
import type { ImprovementStatus } from "@/lib/types/adflow";

export function ApprovalDialog({ improvementId, currentStatus }: { improvementId: string; currentStatus: ImprovementStatus }) {
  const mode = useUiStore((state) => state.reviewDialogMode);
  const setMode = useUiStore((state) => state.setReviewDialogMode);
  const transition = useTransitionImprovement();
  const [reason, setReason] = useState("");
  const open = mode !== null;
  const close = () => {
    setReason("");
    setMode(null);
  };

  const target =
    mode === "approve"
      ? "APPROVED"
      : mode === "reject"
        ? "REJECTED"
        : mode === "applied"
          ? "APPLIED"
          : mode === "failed"
            ? "FAILED"
            : "APPLY_READY";
  const handleConfirm = async () => {
    if (target === "REJECTED" && !reason.trim()) {
      toast.error("A rejection reason is required.");
      return;
    }
    await transition.mutateAsync({ improvementId, newStatus: target, reason: reason.trim() || undefined });
    toast.success(`Improvement moved from ${currentStatus} to ${target}.`);
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent onClose={close}>
        <DialogHeader>
          <DialogTitle>{target === "REJECTED" ? "Reject improvement?" : `Move improvement to ${target}?`}</DialogTitle>
          <DialogDescription>
            This transition is persisted to the database and recorded in the improvement audit log.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          onChange={(event) => setReason(event.target.value)}
          placeholder={target === "REJECTED" ? "Rejection reason (required)" : "Reason or implementation note (optional)"}
          value={reason}
        />
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button disabled={transition.isPending} onClick={handleConfirm}>
            {transition.isPending ? "Saving..." : "Confirm transition"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
