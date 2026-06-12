import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { validateContactPayload } from "@/lib/contact/validation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function ipHash(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const secret = process.env.CONTACT_IP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("CONTACT_IP_HASH_SECRET or SUPABASE_SERVICE_ROLE_KEY is required.");
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const validated = validateContactPayload(payload || {});
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const hash = ipHash(request);
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("contact_inquiries")
    .select("id", { count: "exact", head: true })
    .or(`email.eq.${validated.data.email},ip_hash.eq.${hash}`)
    .gte("created_at", since);
  if (countError) {
    return NextResponse.json({ error: "Unable to validate inquiry rate limit." }, { status: 500 });
  }
  if ((count || 0) >= 3) {
    return NextResponse.json({ error: "Too many inquiries. Please try again later." }, { status: 429 });
  }

  const { data, error } = await supabase
    .from("contact_inquiries")
    .insert({
      ...validated.data,
      ip_hash: hash,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) || null,
    })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: "Unable to save your inquiry." }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, saved: true }, { status: 201 });
}
