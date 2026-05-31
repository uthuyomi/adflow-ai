from __future__ import annotations

from typing import Any

from backend.services.supabase.supabase_repository import SupabaseRepository


class IdeaBacklogService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository

    def generate(
        self,
        *,
        user_id: str,
        session_id: str,
        review_run_id: str,
        mvp_plan: dict[str, Any],
        evidence_count: int,
    ) -> list[dict[str, Any]]:
        items = []
        for title in mvp_plan.get("must_have", [])[:5]:
            items.append(self._insert(user_id, session_id, review_run_id, title, "Feature", "high", evidence_count))
        for title in mvp_plan.get("should_have", [])[:5]:
            items.append(self._insert(user_id, session_id, review_run_id, title, "Validation", "medium", evidence_count))
        items.append(self._insert(user_id, session_id, review_run_id, "Interview target users", "Interview", "high", evidence_count))
        items.append(self._insert(user_id, session_id, review_run_id, "Validate pricing willingness", "Pricing", "medium", evidence_count))
        return items

    def list(self, *, user_id: str, session_id: str) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "idea_backlog",
            user_id=user_id,
            filters={"session_id": session_id},
            order="created_at.desc",
            limit=100,
        )

    def _insert(self, user_id: str, session_id: str, review_run_id: str, title: str, category: str, priority: str, evidence_count: int) -> dict[str, Any]:
        return self.repository.insert(
            "idea_backlog",
            {
                "user_id": user_id,
                "session_id": session_id,
                "idea_review_run_id": review_run_id,
                "title": title,
                "description": f"{category} task for validating or shaping the idea. This is not an implementation command.",
                "category": category,
                "priority": priority,
                "impact_score": 70 if priority == "high" else 55,
                "confidence_score": min(90, 35 + evidence_count),
                "evidence_count": evidence_count,
                "rationale": "Generated from Idea Review and MVP planning.",
            },
        )
