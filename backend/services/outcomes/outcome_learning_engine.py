from __future__ import annotations

from collections import defaultdict
from typing import Any

from backend.services.supabase.supabase_repository import SupabaseRepository


TERMINAL_OUTCOME_STATUSES = {"SUCCESS", "PARTIAL_SUCCESS", "NO_IMPACT", "FAILED"}


class OutcomeLearningEngine:
    def __init__(self, repository: SupabaseRepository) -> None:
        self.repository = repository

    def save(self, *, user_id: str, outcome: dict[str, Any]) -> dict[str, Any] | None:
        if outcome.get("outcome_status") not in TERMINAL_OUTCOME_STATUSES:
            return None
        improvement = self._improvement(user_id, outcome.get("source_ai_result_id"))
        if improvement and improvement.get("provider_type") != "REAL":
            return None
        before = outcome.get("before_metrics") or {}
        after = outcome.get("after_metrics") or {}
        shared = [key for key in before if key in after and _number(before.get(key)) is not None and _number(after.get(key)) is not None]
        if not shared:
            return None
        quality = min(1.0, len(shared) / 3 + (0.2 if outcome.get("evidence_data") else 0))
        confidence = float((improvement or {}).get("confidence") or 0.5) * quality
        improvement_rate = float(outcome.get("improvement_rate") or 0)
        status = str(outcome["outcome_status"])
        success = status in {"SUCCESS", "PARTIAL_SUCCESS"}
        score = round((max(min(improvement_rate, 1), -1) * 50) + (confidence * 50), 4)
        project = self._optional("ad_projects", user_id, outcome.get("project_id"))
        payload = {
            "user_id": user_id,
            "outcome_id": outcome["id"],
            "project_id": outcome.get("project_id"),
            "improvement_id": outcome.get("source_ai_result_id"),
            "improvement_type": str((improvement or {}).get("task") or "manual"),
            "project_type": str((project or {}).get("description") or "unspecified")[:120],
            "market_type": str((outcome.get("measurement_plan") or {}).get("market_type") or "unspecified")[:120],
            "before_metrics": before,
            "after_metrics": after,
            "improvement_rate": improvement_rate,
            "success_flag": success,
            "confidence_score": round(confidence, 4),
            "measurement_quality": round(quality, 4),
            "outcome_status": status,
            "learning_score": score,
        }
        rows = self.repository.get_many("outcome_learning_data", user_id=user_id, filters={"outcome_id": outcome["id"]}, limit=1)
        return (
            self.repository.update("outcome_learning_data", user_id=user_id, filters={"id": rows[0]["id"]}, payload=payload)
            if rows
            else self.repository.insert("outcome_learning_data", payload)
        )

    def context(
        self,
        *,
        user_id: str,
        project_id: str | None = None,
        improvement_type: str | None = None,
        market_type: str | None = None,
        limit: int = 100,
    ) -> dict[str, Any]:
        rows = self.repository.get_many("outcome_learning_data", user_id=user_id, order="learning_score.desc", limit=limit)
        similar = [
            row for row in rows
            if (not project_id or row.get("project_id") == project_id)
            and (not improvement_type or row.get("improvement_type") == improvement_type)
            and (not market_type or row.get("market_type") == market_type)
        ]
        return {
            "summary": self._summary(rows),
            "similar_summary": self._summary(similar),
            "similar_cases": similar[:10],
            "successful_patterns": self._group(rows, success=True),
            "failed_patterns": self._group(rows, success=False),
            "guardrail": "Historical outcomes guide prioritization but do not guarantee future performance.",
        }

    def stats(self, *, user_id: str) -> dict[str, Any]:
        rows = self.repository.get_many("outcome_learning_data", user_id=user_id, limit=1000)
        return {
            **self._summary(rows),
            "by_market": self._category_stats(rows, "market_type"),
            "by_improvement": self._category_stats(rows, "improvement_type"),
            "by_project": self._category_stats(rows, "project_id"),
        }

    @staticmethod
    def _summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
        total = len(rows)
        successes = sum(1 for row in rows if row.get("success_flag"))
        rates = [float(row.get("improvement_rate") or 0) for row in rows]
        return {
            "learning_count": total,
            "success_count": successes,
            "failure_count": total - successes,
            "success_rate": round(successes * 100 / total, 2) if total else 0,
            "average_improvement_rate": round(sum(rates) / total, 6) if total else 0,
        }

    @classmethod
    def _category_stats(cls, rows: list[dict[str, Any]], key: str) -> list[dict[str, Any]]:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in rows:
            grouped[str(row.get(key) or "unspecified")].append(row)
        return [{"category": category, **cls._summary(items)} for category, items in grouped.items()]

    @staticmethod
    def _group(rows: list[dict[str, Any]], *, success: bool) -> list[dict[str, Any]]:
        filtered = [row for row in rows if bool(row.get("success_flag")) is success]
        return [
            {
                "improvement_type": row.get("improvement_type"),
                "market_type": row.get("market_type"),
                "improvement_rate": row.get("improvement_rate"),
                "learning_score": row.get("learning_score"),
            }
            for row in filtered[:10]
        ]

    def _improvement(self, user_id: str, improvement_id: str | None) -> dict[str, Any] | None:
        return self._optional("ai_agent_results", user_id, improvement_id)

    def _optional(self, table: str, user_id: str, record_id: str | None) -> dict[str, Any] | None:
        if not record_id:
            return None
        rows = self.repository.get_many(table, user_id=user_id, filters={"id": record_id}, limit=1)
        return rows[0] if rows else None


def _number(value: Any) -> float | None:
    try:
        return None if value is None or value == "" else float(value)
    except (TypeError, ValueError):
        return None
