from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.services.supabase.supabase_repository import SupabaseRepository


IMPROVEMENT_STATUSES = ("GENERATED", "APPROVED", "REJECTED", "APPLY_READY", "APPLIED", "FAILED")
ALLOWED_TRANSITIONS = {
    "GENERATED": {"APPROVED", "REJECTED"},
    "APPROVED": {"APPLY_READY", "REJECTED"},
    "REJECTED": set(),
    "APPLY_READY": {"APPLIED", "FAILED"},
    "APPLIED": set(),
    "FAILED": {"APPLY_READY"},
}


class ImprovementWorkflowService:
    def __init__(self, repository: SupabaseRepository) -> None:
        self.repository = repository

    def list_improvements(
        self,
        *,
        user_id: str,
        status: str | None = None,
        search: str | None = None,
        sort: str = "newest",
        limit: int = 200,
    ) -> list[dict[str, Any]]:
        normalized_status = self._normalize_optional_status(status)
        rows = self.repository.get_many(
            "ai_agent_results",
            user_id=user_id,
            filters={"decision_status": normalized_status} if normalized_status else None,
            order="created_at.desc",
            limit=min(max(limit, 1), 500),
        )
        query = (search or "").strip().lower()
        if query:
            rows = [row for row in rows if query in self._search_text(row)]
        return sorted(rows, key=self._sort_key(sort), reverse=sort != "oldest")

    def get_improvement(self, *, user_id: str, improvement_id: str) -> dict[str, Any]:
        return self.repository.get_one("ai_agent_results", user_id=user_id, filters={"id": improvement_id})

    def list_history(self, *, user_id: str, improvement_id: str) -> list[dict[str, Any]]:
        self.get_improvement(user_id=user_id, improvement_id=improvement_id)
        return self.repository.get_many(
            "improvement_status_history",
            user_id=user_id,
            filters={"improvement_id": improvement_id},
            order="changed_at.desc",
            limit=200,
        )

    def stats(self, *, user_id: str) -> dict[str, Any]:
        try:
            stats = self.repository.rpc("get_improvement_workflow_stats", {"p_user_id": user_id})
            if isinstance(stats, dict):
                return stats
        except (AttributeError, ValueError):
            pass
        rows = self.repository.get_many("ai_agent_results", user_id=user_id)
        counts = {status: 0 for status in IMPROVEMENT_STATUSES}
        for row in rows:
            status = str(row.get("decision_status") or "GENERATED").upper()
            if status in counts:
                counts[status] += 1
        total = sum(counts.values())
        return {
            "total": total,
            "counts": counts,
            "approval_rate": round((counts["APPROVED"] + counts["APPLY_READY"] + counts["APPLIED"]) * 100 / total, 2)
            if total
            else 0,
            "rejection_rate": round(counts["REJECTED"] * 100 / total, 2) if total else 0,
        }

    def transition(
        self,
        *,
        user_id: str,
        improvement_id: str,
        new_status: str,
        reason: str | None = None,
    ) -> dict[str, Any]:
        target = self._normalize_status(new_status)
        current = self.get_improvement(user_id=user_id, improvement_id=improvement_id)
        old_status = self._normalize_status(str(current.get("decision_status") or "GENERATED"))
        if target not in ALLOWED_TRANSITIONS[old_status]:
            raise ValueError(f"Invalid improvement status transition: {old_status} -> {target}")
        normalized_reason = (reason or "").strip() or None
        if target == "REJECTED" and not normalized_reason:
            raise ValueError("A rejection reason is required.")
        now = datetime.now(timezone.utc).isoformat()
        payload: dict[str, Any] = {
            "decision_status": target,
            "decision_reason": normalized_reason,
            "decided_at": now,
            "updated_by": user_id,
            "status_updated_at": now,
            "accepted_by": user_id if target in {"APPROVED", "APPLY_READY", "APPLIED"} else None,
        }
        if target == "APPLY_READY":
            payload["apply_ready_metadata"] = {
                "prepared_at": now,
                "prepared_by": user_id,
                "source_ai_result_id": improvement_id,
                "project_id": current.get("project_id"),
                "ad_lp_pair_id": current.get("ad_lp_pair_id"),
                "orchestration_run_id": current.get("orchestration_run_id"),
            }
        updated = self.repository.update(
            "ai_agent_results",
            user_id=user_id,
            filters={"id": improvement_id, "decision_status": old_status},
            payload=payload,
        )
        if updated.get("id") is None:
            raise ValueError("Improvement status changed concurrently. Reload and try again.")
        return updated

    @staticmethod
    def _normalize_status(status: str) -> str:
        normalized = status.strip().upper()
        if normalized not in IMPROVEMENT_STATUSES:
            raise ValueError("Invalid improvement status.")
        return normalized

    @classmethod
    def _normalize_optional_status(cls, status: str | None) -> str | None:
        if not status:
            return None
        return cls._normalize_status(status)

    @staticmethod
    def _search_text(row: dict[str, Any]) -> str:
        output = row.get("output") or {}
        values = [
            row.get("agent_key"),
            row.get("provider"),
            row.get("task"),
            row.get("input_summary"),
            output.get("summary") if isinstance(output, dict) else None,
        ]
        return " ".join(str(value).lower() for value in values if value)

    @staticmethod
    def _sort_key(sort: str):
        if sort == "confidence":
            return lambda row: float(row.get("confidence") or 0)
        if sort == "score":
            return lambda row: float(row.get("score") or 0)
        return lambda row: str(row.get("created_at") or "")
