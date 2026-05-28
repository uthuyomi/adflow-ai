import { fallbackLp } from "@/lib/mock-data";
import { runWorkflow } from "@/lib/api/client";

export async function getLpAnalysis() {
  const workflow = await runWorkflow();
  return workflow.lp ?? fallbackLp;
}
