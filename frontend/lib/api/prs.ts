import { buildPrs } from "@/lib/mock-data";
import { runWorkflow } from "@/lib/api/client";

export async function getPullRequests() {
  const workflow = await runWorkflow();
  return buildPrs(workflow);
}
