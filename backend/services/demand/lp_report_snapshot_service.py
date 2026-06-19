from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any

from backend.services.demand.demand_intelligence_service import DemandIntelligenceService
from backend.services.supabase.supabase_repository import SupabaseRepository


class LPReportSnapshotService:
    def __init__(self, *, repository: SupabaseRepository, demand_service: DemandIntelligenceService) -> None:
        self.repository = repository
        self.demand_service = demand_service

    def refresh(
        self,
        *,
        user_id: str,
        project_id: str,
        pair_id: str,
        query: str,
        now: datetime | None = None,
    ) -> dict[str, Any]:
        timestamp = now or datetime.now(timezone.utc)
        iso_year, iso_week, _ = timestamp.isocalendar()
        fingerprint = f"lp-weekly-snapshot-{iso_year}-W{iso_week:02d}"
        run = self.demand_service.run(
            user_id=user_id,
            project_id=project_id,
            ad_lp_pair_id=pair_id,
            query=query,
            locale="en",
            mode="pair_analysis",
            research_fingerprint=fingerprint,
        )
        run_id = str(run["id"])

        existing = self.repository.get_related_many(
            "lp_report_snapshots",
            filters={"run_id": run_id},
            limit=1,
        )
        if existing:
            return {**existing[0], "reused": True}

        evidence = self.repository.get_real_demand_evidence_for_run(user_id=user_id, run_id=run_id)
        competitors = self.repository.get_demand_competitors_for_run(user_id=user_id, run_id=run_id)
        score = self.repository.get_demand_score_for_run(user_id=user_id, run_id=run_id)
        signals = self.repository.get_related_many(
            "demand_intelligence_signals",
            filters={"run_id": run_id},
            limit=10_000,
        )
        clusters = self.repository.get_related_many(
            "demand_intelligence_clusters",
            filters={"run_id": run_id},
            limit=1_000,
        )
        source_runs = self.repository.get_demand_source_runs_for_run(user_id=user_id, run_id=run_id)

        real_signals = [item for item in signals if item.get("data_source_type") == "REAL"]
        connector_counts = Counter(str(item.get("connector_key") or "unknown") for item in real_signals)
        demand_score = float(score.get("score") or 0)
        recommendation = self._recommendation(
            demand_score=demand_score,
            evidence_count=len(evidence),
            real_source_count=len(connector_counts),
        )
        confidence = self._confidence(evidence_count=len(evidence), real_source_count=len(connector_counts))
        opportunity = self._opportunity(demand_score=demand_score)
        reasons = self._reasons(score=score, competitor_count=len(competitors))
        next_action = self._next_action(recommendation)
        snapshot = self.repository.insert(
            "lp_report_snapshots",
            {
                "run_id": run_id,
                "query": query,
                "recommendation": recommendation,
                "confidence": confidence,
                "opportunity": opportunity,
                "reasons": reasons,
                "next_action": next_action,
                "demand_score": demand_score,
                "evidence_count": len(evidence),
                "competitor_candidate_count": len(competitors),
                "cluster_count": len(clusters),
                "real_source_count": len(connector_counts),
                "source_counts": dict(connector_counts),
                "source_statuses": [
                    {
                        "source": (item.get("metadata") or {}).get("connector_key") or item.get("source_type") or "unknown",
                        "status": item.get("status"),
                    }
                    for item in source_runs
                ],
                "collected_at": run.get("completed_at") or run.get("created_at") or timestamp.isoformat(),
            },
        )
        return {**snapshot, "reused": bool(run.get("_reused"))}

    @staticmethod
    def _recommendation(*, demand_score: float, evidence_count: int, real_source_count: int) -> str:
        if demand_score >= 70 and evidence_count >= 50 and real_source_count >= 3:
            return "BUILD"
        if demand_score >= 40 and evidence_count >= 15 and real_source_count >= 2:
            return "PIVOT"
        return "WAIT"

    @staticmethod
    def _confidence(*, evidence_count: int, real_source_count: int) -> str:
        if evidence_count >= 50 and real_source_count >= 4:
            return "High"
        if evidence_count >= 15 and real_source_count >= 2:
            return "Medium"
        return "Low"

    @staticmethod
    def _opportunity(*, demand_score: float) -> str:
        if demand_score >= 70:
            return "High"
        if demand_score >= 40:
            return "Medium"
        return "Low"

    @staticmethod
    def _reasons(*, score: dict[str, Any], competitor_count: int) -> list[str]:
        reasons: list[str] = []
        if float(score.get("review_pain") or 0) >= 60:
            reasons.append("Recurring pain signals found in reviews")
        if competitor_count >= 10:
            reasons.append("Active competitor category detected")
        if float(score.get("social_discussion") or 0) < 40:
            reasons.append("Social discussion remains limited")
        if float(score.get("trend_strength") or 0) < 40:
            reasons.append("Growth evidence remains limited")
        if float(score.get("search_demand") or 0) >= 60:
            reasons.append("Strong search evidence detected")
        return reasons[:3] or ["Evidence remains insufficient for a build decision"]

    @staticmethod
    def _next_action(recommendation: str) -> str:
        if recommendation == "BUILD":
            return "Build a narrow MVP and measure activation with the first users."
        if recommendation == "PIVOT":
            return "Launch a focused landing page and test signup and payment intent."
        return "Collect more customer evidence before committing development time."
