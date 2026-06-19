"use client";

import { toast } from "sonner";

export type PlanErrorCode = "PLAN_UPGRADE_REQUIRED" | "PLAN_LIMIT_REACHED";

type PlanErrorDetail = {
  error: PlanErrorCode;
  message?: string;
  currentPlan?: string;
  requiredPlan?: string;
  feature?: string;
  limit?: number;
  currentUsage?: number;
  pricingUrl?: string;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public detail?: PlanErrorDetail,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function apiErrorFromResponse(response: Response): Promise<ApiRequestError> {
  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return new ApiRequestError(text || response.statusText, response.status);
  }
  const body = payload as { detail?: string | PlanErrorDetail };
  if (body.detail && typeof body.detail === "object" && "error" in body.detail) {
    const detail = body.detail;
    return new ApiRequestError(
      detail.message || response.statusText,
      response.status,
      detail.error,
      detail,
    );
  }
  return new ApiRequestError(
    typeof body.detail === "string" ? body.detail : text,
    response.status,
  );
}

export function normalizeSupabaseError(error: unknown): Error {
  if (!(error instanceof Error)) return new Error(String(error));
  const candidate = error as Error & { code?: string; details?: string; hint?: string };
  if (candidate.code === "P0001" && candidate.message.includes("PLAN_LIMIT_REACHED")) {
    return new ApiRequestError(
      candidate.details || "Free plan supports up to 10 saved items.",
      403,
      "PLAN_LIMIT_REACHED",
      {
        error: "PLAN_LIMIT_REACHED",
        message: candidate.details || "Free plan supports up to 10 saved items.",
        currentPlan: "free",
        requiredPlan: "starter",
        feature: "saved_items",
        limit: 10,
        pricingUrl: "/pricing",
      },
    );
  }
  if (candidate.code === "P0001" && candidate.message.includes("PLAN_UPGRADE_REQUIRED")) {
    const experiment = candidate.details?.includes("Growth");
    return new ApiRequestError(
      candidate.details || "A higher plan is required for this feature.",
      403,
      "PLAN_UPGRADE_REQUIRED",
      {
        error: "PLAN_UPGRADE_REQUIRED",
        message: candidate.details || "A higher plan is required for this feature.",
        currentPlan: "free",
        requiredPlan: experiment ? "growth" : "starter",
        feature: experiment ? "experiment_create" : "pair_analysis",
        pricingUrl: "/pricing",
      },
    );
  }
  return error;
}

export function showActionableError(
  error: unknown,
  fallback: string,
  upgradeLabel = "View pricing",
): void {
  const normalized = normalizeSupabaseError(error);
  if (normalized instanceof ApiRequestError && normalized.code?.startsWith("PLAN_")) {
    toast.error(normalized.message, {
      action: {
        label: upgradeLabel,
        onClick: () => window.location.assign(normalized.detail?.pricingUrl || "/pricing"),
      },
    });
    return;
  }
  toast.error(normalized instanceof Error ? normalized.message : fallback);
}
