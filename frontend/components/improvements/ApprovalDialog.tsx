"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApproveImprovement, useCreatePullRequest } from "@/hooks/useImprovement";
import { useUiStore } from "@/lib/store";

export function ApprovalDialog({ improvementId }: { improvementId: string }) {
  const mode = useUiStore((state) => state.reviewDialogMode);
  const setMode = useUiStore((state) => state.setReviewDialogMode);
  const approve = useApproveImprovement();
  const createPr = useCreatePullRequest();
  const router = useRouter();

  const open = mode !== null;
  const close = () => setMode(null);

  const handleConfirm = async () => {
    if (mode === "approve") {
      await approve.mutateAsync(improvementId);
      toast.success("Improvement approved for PR preparation.");
      close();
      return;
    }
    if (mode === "pr") {
      await createPr.mutateAsync(improvementId);
      toast.success("PR creation request completed.");
      close();
      router.push("/prs");
      return;
    }
    toast.info("Improvement marked as rejected in this review session.");
    close();
  };

  return (
    <Dialog open={open} onOpenChange={setMode.bind(null, null)}>
      <DialogContent onClose={close}>
        <DialogHeader>
          <DialogTitle>
            {mode === "pr" ? "Create pull request?" : mode === "reject" ? "Reject improvement?" : "Approve improvement?"}
          </DialogTitle>
          <DialogDescription>
            This action does not merge or push code. PR creation remains the final
            automated step before human GitHub review.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={handleConfirm}>
            {mode === "pr" ? "Create PR" : mode === "reject" ? "Reject" : "Approve"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
