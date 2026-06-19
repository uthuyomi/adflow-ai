import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("lp_report_snapshots")
    .select("*")
    .order("collected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Unable to load the latest LP report snapshot." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ snapshot: null });
  }

  const unavailableSources = (data.source_statuses || [])
    .filter((item: { status?: string }) => ["failed", "unavailable"].includes(item.status || ""))
    .map((item: { source?: string }) => item.source || "unknown");

  return NextResponse.json({
    snapshot: {
      runId: data.run_id,
      collectedAt: String(data.collected_at).slice(0, 10),
      query: data.query,
      recommendation: data.recommendation,
      weeklyDecision: {
        updatedAt: String(data.collected_at).slice(0, 10),
        topic: data.query,
        decision: data.recommendation,
        confidence: data.confidence,
        opportunity: data.opportunity,
        reasons: data.reasons,
        nextAction: data.next_action,
      },
      demandScore: Number(data.demand_score),
      evidenceCount: data.evidence_count,
      competitorCandidateCount: data.competitor_candidate_count,
      clusterCount: data.cluster_count,
      realSourceCount: data.real_source_count,
      sourceCounts: data.source_counts,
      unavailableSources,
    },
  });
}
