import { buildImprovements } from "@/lib/mock-data";
import { runWorkflow } from "@/lib/api/client";

export async function getImprovements() {
  const workflow = await runWorkflow();
  return buildImprovements(workflow);
}

export async function getImprovementDetail(improvementId: string) {
  const improvements = await getImprovements();
  return improvements.find((item) => item.id === improvementId) ?? improvements[0];
}

export async function approveImprovement(improvementId: string) {
  return { improvementId, status: "Approved" as const };
}

export async function createPullRequest(improvementId: string) {
  const workflow = await runWorkflow();
  return {
    improvementId,
    pr: workflow.pull_request,
  };
}
