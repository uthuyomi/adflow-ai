from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.services.idea_lab.idea_research_service import IdeaResearchService
from backend.services.idea_lab.models import IdeaMonitoringRequest
from backend.services.idea_lab.session_service import IdeaSessionService
from backend.services.supabase.supabase_repository import SupabaseRepository


class IdeaMonitoringService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository
        self.sessions = IdeaSessionService(repository=repository)
        self.research = IdeaResearchService(repository=repository)

    def run(self, *, user_id: str, request: IdeaMonitoringRequest) -> dict[str, Any]:
        session = self.sessions.get(user_id=user_id, session_id=request.session_id)
        profile = session.get("profile") or {}
        query = request.query or " ".join(str(profile.get(key) or "") for key in ["title", "problem_statement", "market_category"])
        run = self.repository.insert(
            "idea_monitoring_runs",
            {
                "user_id": user_id,
                "session_id": request.session_id,
                "query": query,
                "status": "running",
                "monitoring_type": request.monitoring_type,
            },
        )
        evidence = self.research.collect(
            user_id=user_id,
            session_id=request.session_id,
            query=query,
            max_items=request.max_evidence_items,
        )
        alerts = self._alerts(evidence.get("clusters", []), request.monitoring_type)
        return self.repository.update(
            "idea_monitoring_runs",
            user_id=user_id,
            filters={"id": run["id"]},
            payload={
                "status": "completed",
                "evidence_count": evidence["evidence_count"],
                "alerts": alerts,
                "summary": {"note": "Idea monitoring signals are directional and should be reviewed."},
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    def list(self, *, user_id: str, session_id: str) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "idea_monitoring_runs",
            user_id=user_id,
            filters={"session_id": session_id},
            order="created_at.desc",
            limit=30,
        )

    @staticmethod
    def _alerts(clusters: list[dict[str, Any]], monitoring_type: str) -> list[dict[str, Any]]:
        alerts = []
        for cluster in clusters[:5]:
            alert_type = {
                "competitor_trend": "Competition Alert",
                "search_trend": "Search Shift Alert",
                "pricing_trend": "Risk Alert",
            }.get(monitoring_type, "Opportunity Alert")
            alerts.append(
                {
                    "alert_type": alert_type,
                    "severity": "high" if int(cluster.get("evidence_count") or 0) >= 8 else "medium",
                    "title": cluster.get("label"),
                    "description": cluster.get("description"),
                },
            )
        return alerts
