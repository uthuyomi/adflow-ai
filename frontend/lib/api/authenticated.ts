"use client";

import { getApiBaseUrl } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function requestWithAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  if (!data.session?.access_token) throw new Error("Login is required.");
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}
