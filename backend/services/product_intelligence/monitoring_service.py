from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.core.config import Settings
from backend.services.evidence.evidence_service import EvidenceService
from backend.services.evidence.models import EvidenceCollectionRequest
from backend.services.product_intelligence.models import MonitoringRunRequest
from backend.services.supabase.supabase_repository import SupabaseRepository


class MonitoringService:
    def __init__(self, *, repository: SupabaseRepository, settings: Settings | None = None) -> None:
        self.repository = repository
        self.evidence_service = EvidenceService(repository=repository, settings=settings)

    def run(self, *, user_id: str, request: MonitoringRunRequest) -> dict[str, Any]:
        run = self.repository.insert(
            "monitoring_runs",
            {
                "user_id": user_id,
                "project_id": request.project_id,
                "ad_lp_pair_id": request.ad_lp_pair_id,
                "query": request.query,
                "status": "collecting",
                "monitoring_type": request.monitoring_type,
            },
        )
        try:
            evidence_result = self.evidence_service.collect(
                user_id=user_id,
                request=EvidenceCollectionRequest(
                    project_id=request.project_id,
                    ad_lp_pair_id=request.ad_lp_pair_id,
                    monitoring_run_id=run["id"],
                    query=request.query,
                    sources=self._sources_for(request.monitoring_type),
                    max_items=request.max_evidence_items,
                ),
            )
            alerts = self._alerts(
                user_id=user_id,
                project_id=request.project_id,
                pair_id=request.ad_lp_pair_id,
                run_id=run["id"],
                monitoring_type=request.monitoring_type,
                clusters=evidence_result.clusters,
            )
            summary = {
                "monitoring_type": request.monitoring_type,
                "evidence_count": evidence_result.evidence_count,
                "cluster_count": evidence_result.cluster_count,
                "interpretation": "Monitoring signals are directional and require review before action.",
            }
            updated = self.repository.update(
                "monitoring_runs",
                user_id=user_id,
                filters={"id": run["id"]},
                payload={
                    "status": "completed",
                    "evidence_count": evidence_result.evidence_count,
                    "new_cluster_count": evidence_result.cluster_count,
                    "changed_cluster_count": 0,
                    "summary": summary,
                    "alerts": alerts,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            return {**updated, "alert_records": alerts}
        except Exception:
            self.repository.update(
                "monitoring_runs",
                user_id=user_id,
                filters={"id": run["id"]},
                payload={"status": "failed", "updated_at": datetime.now(timezone.utc).isoformat()},
            )
            raise

    def list_runs(self, *, user_id: str, project_id: str, limit: int = 30) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "monitoring_runs",
            user_id=user_id,
            filters={"project_id": project_id},
            order="created_at.desc",
            limit=limit,
        )

    def list_alerts(self, *, user_id: str, project_id: str, status: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        filters = {"project_id": project_id}
        if status:
            filters["status"] = status
        return self.repository.get_many(
            "intelligence_alerts",
            user_id=user_id,
            filters=filters,
            order="created_at.desc",
            limit=limit,
        )

    def update_alert(self, *, user_id: str, alert_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        allowed_statuses = {"open", "reviewed", "closed"}
        if payload.get("status") and payload["status"] not in allowed_statuses:
            raise ValueError("Invalid alert status.")
        return self.repository.update(
            "intelligence_alerts",
            user_id=user_id,
            filters={"id": alert_id},
            payload={**payload, "updated_at": datetime.now(timezone.utc).isoformat()},
        )

    def open_alert_context(self, *, user_id: str, project_id: str | None) -> list[dict[str, Any]]:
        if not project_id:
            return []
        return self.list_alerts(user_id=user_id, project_id=project_id, status="open", limit=10)

    @staticmethod
    def _sources_for(monitoring_type: str) -> list[str]:
        mapping = {
            "market": ["mock", "web_stub", "search_stub"],
            "competitor": ["mock", "competitor_stub", "web_stub"],
            "review": ["mock", "review_stub"],
            "search_intent": ["mock", "search_stub"],
            "pain_trend": ["mock", "reddit_stub", "twitter_stub", "review_stub"],
        }
        return mapping.get(monitoring_type, ["mock", "web_stub"])

    def _alerts(
        self,
        *,
        user_id: str,
        project_id: str,
        pair_id: str | None,
        run_id: str,
        monitoring_type: str,
        clusters: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        alerts: list[dict[str, Any]] = []
        for cluster in clusters[:5]:
            evidence_count = int(cluster.get("evidence_count") or 0)
            trend_score = float(cluster.get("trend_score") or 0)
            if evidence_count < 3 and trend_score < 50:
                continue
            alert_type = self._alert_type(monitoring_type, str(cluster.get("cluster_type") or ""))
            severity = "high" if trend_score >= 75 or evidence_count >= 8 else "medium"
            alerts.append(
                self.repository.insert(
                    "intelligence_alerts",
                    {
                        "user_id": user_id,
                        "project_id": project_id,
                        "ad_lp_pair_id": pair_id,
                        "monitoring_run_id": run_id,
                        "alert_type": alert_type,
                        "severity": severity,
                        "title": f"{cluster.get('label') or alert_type}",
                        "description": (
                            f"{evidence_count} evidence items formed a {cluster.get('cluster_type')} cluster. "
                            "Review before changing ads, LP, or product."
                        ),
                        "evidence_cluster_ids": [cluster.get("id")] if cluster.get("id") else [],
                        "evidence_source_ids": cluster.get("representative_evidence_ids") or [],
                        "status": "open",
                        "metadata": {"monitoring_type": monitoring_type, "trend_score": trend_score},
                    },
                ),
            )
        return alerts

    @staticmethod
    def _alert_type(monitoring_type: str, cluster_type: str) -> str:
        if monitoring_type == "competitor":
            return "competitor_change"
        if monitoring_type == "review":
            return "review_drop"
        if monitoring_type == "search_intent":
            return "search_intent_shift"
        if cluster_type in {"pain", "ux_issue", "pricing"}:
            return "pain_spike"
        if cluster_type == "competitor":
            return "new_competitor"
        return "opportunity_signal"
