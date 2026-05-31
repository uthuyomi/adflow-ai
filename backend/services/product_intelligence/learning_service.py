from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.services.product_intelligence.models import LearningPatternRefreshResult
from backend.services.supabase.supabase_repository import SupabaseRepository


class LearningService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository

    def refresh(self, *, user_id: str, project_id: str) -> LearningPatternRefreshResult:
        outcomes = self.repository.get_many(
            "improvement_outcomes",
            user_id=user_id,
            filters={"project_id": project_id},
            order="created_at.desc",
            limit=200,
        )
        grouped: dict[str, list[dict[str, Any]]] = {}
        for outcome in outcomes:
            pattern_type = self._pattern_type(outcome)
            grouped.setdefault(pattern_type, []).append(outcome)
        patterns = [
            self._upsert_pattern(user_id=user_id, project_id=project_id, pattern_type=pattern_type, outcomes=items)
            for pattern_type, items in grouped.items()
        ]
        return LearningPatternRefreshResult(project_id=project_id, pattern_count=len(patterns), patterns=patterns)

    def list_patterns(self, *, user_id: str, project_id: str, limit: int = 50) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "learning_patterns",
            user_id=user_id,
            filters={"project_id": project_id},
            order="recommendation_bias.desc",
            limit=limit,
        )

    def context_for_project(self, *, user_id: str, project_id: str | None) -> list[dict[str, Any]]:
        if not project_id:
            return []
        return self.list_patterns(user_id=user_id, project_id=project_id, limit=20)

    def _upsert_pattern(
        self,
        *,
        user_id: str,
        project_id: str,
        pattern_type: str,
        outcomes: list[dict[str, Any]],
    ) -> dict[str, Any]:
        success = [item for item in outcomes if item.get("outcome_status") == "positive"]
        failure = [item for item in outcomes if item.get("outcome_status") == "negative"]
        inconclusive = [
            item for item in outcomes if item.get("outcome_status") in {"neutral", "inconclusive", "measured", "pending"}
        ]
        confidence = min(95, 30 + len(outcomes) * 12)
        bias = len(success) * 1.0 - len(failure) * 1.2 + len(inconclusive) * 0.1
        payload = {
            "pattern_type": pattern_type,
            "target_area": pattern_type,
            "title": f"{pattern_type.replace('_', ' ').title()} outcome pattern",
            "description": self._description(pattern_type, success, failure, inconclusive),
            "source_outcome_ids": [item["id"] for item in outcomes],
            "source_backlog_item_ids": [],
            "success_count": len(success),
            "failure_count": len(failure),
            "inconclusive_count": len(inconclusive),
            "confidence_score": confidence,
            "recommendation_bias": round(bias, 2),
            "metadata": {"refreshed_at": datetime.now(timezone.utc).isoformat()},
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        existing = self.repository.get_many(
            "learning_patterns",
            user_id=user_id,
            filters={"project_id": project_id, "pattern_type": pattern_type},
            limit=1,
        )
        if existing:
            return self.repository.update(
                "learning_patterns",
                user_id=user_id,
                filters={"id": existing[0]["id"]},
                payload=payload,
            )
        return self.repository.insert("learning_patterns", {"user_id": user_id, "project_id": project_id, **payload})

    @staticmethod
    def _pattern_type(outcome: dict[str, Any]) -> str:
        text = f"{outcome.get('title') or ''} {outcome.get('description') or ''}".lower()
        for key in ("ad_copy", "lp_hero", "cta", "pricing", "onboarding", "feature", "ux", "activation", "retention"):
            if key.replace("_", " ") in text or key in text:
                return key
        if outcome.get("source_codex_task_id"):
            return "feature"
        return "ad_copy"

    @staticmethod
    def _description(
        pattern_type: str,
        success: list[dict[str, Any]],
        failure: list[dict[str, Any]],
        inconclusive: list[dict[str, Any]],
    ) -> str:
        return (
            f"{pattern_type} has {len(success)} positive, {len(failure)} negative, "
            f"and {len(inconclusive)} inconclusive outcomes. Use this as a biasing signal, not a guarantee."
        )
