import { NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_BASE_URL is required." }, { status: 503 });
  }

  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/internal/lp-report-snapshot/refresh`, {
    method: "POST",
    headers: { "x-cron-secret": secret },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({ error: "Backend returned a non-JSON response." }));
  return NextResponse.json(body, { status: response.status });
}
