"use client";

import { WorkflowResultSchema, type WorkflowResult } from "@/lib/schemas";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(await response.text(), response.status);
  }

  return response.json() as Promise<T>;
}

export async function runWorkflow(): Promise<WorkflowResult> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new ApiError("Login is required.", 401);
  }
  const payload = await request<unknown>("/workflow/run", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return WorkflowResultSchema.parse(payload);
}
