from __future__ import annotations

from typing import Any

from backend.services.supabase.supabase_repository import SupabaseRepository


class IdeaRoadmapService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository

    def generate(self, *, user_id: str, session_id: str, review_run_id: str) -> dict[str, Any]:
        backlog = self.repository.get_many("idea_backlog", user_id=user_id, filters={"session_id": session_id}, limit=100)
        now_items = [self._item(item) for item in backlog if item.get("priority") in {"critical", "high"}][:5]
        next_items = [self._item(item) for item in backlog if item.get("priority") == "medium"][:8]
        later_items = [
            {"title": "Beta release", "category": "Validation"},
            {"title": "Ad validation", "category": "Marketing"},
            {"title": "Feature expansion only after evidence improves", "category": "Feature"},
        ]
        return self.repository.insert(
            "idea_roadmaps",
            {
                "user_id": user_id,
                "session_id": session_id,
                "idea_review_run_id": review_run_id,
                "now_items": now_items or [{"title": "MVP scope validation", "category": "Validation"}],
                "next_items": next_items or [{"title": "LP and pricing smoke test", "category": "Marketing"}],
                "later_items": later_items,
                "summary": "Roadmap is a validation sequence, not a guarantee or automatic build plan.",
            },
        )

    def latest(self, *, user_id: str, session_id: str) -> dict[str, Any]:
        rows = self.repository.get_many("idea_roadmaps", user_id=user_id, filters={"session_id": session_id}, order="created_at.desc", limit=1)
        if not rows:
            raise ValueError("No idea roadmap was found.")
        return rows[0]

    @staticmethod
    def _item(item: dict[str, Any]) -> dict[str, Any]:
        return {"id": item.get("id"), "title": item.get("title"), "category": item.get("category"), "priority": item.get("priority")}
