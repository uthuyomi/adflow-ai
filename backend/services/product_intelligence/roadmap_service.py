from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.services.supabase.supabase_repository import SupabaseRepository


class ProductRoadmapService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository

    def generate(self, *, user_id: str, project_id: str, product_review_run_id: str | None = None, title: str | None = None) -> dict[str, Any]:
        backlog = self.repository.get_many(
            "product_improvement_backlog",
            user_id=user_id,
            filters={"project_id": project_id},
            order="impact_cost_ratio.desc",
            limit=100,
        )
        do_not_build = [item for item in backlog if item.get("status") in {"rejected", "deferred"} or item.get("priority") == "low"]
        candidates = [item for item in backlog if item not in do_not_build and item.get("status") != "converted_to_codex_task"]
        now_items = [
            self._roadmap_item(item)
            for item in candidates
            if item.get("priority") in {"critical", "high"} and float(item.get("confidence_score") or 0) >= 60
        ][:5]
        next_items = [
            self._roadmap_item(item)
            for item in candidates
            if item.get("priority") == "medium" or item.get("status") in {"approved", "needs_review"}
        ][:8]
        later_items = [self._roadmap_item(item) for item in candidates if item.get("priority") == "low"][:8]
        needs_more_evidence = [
            self._roadmap_item(item)
            for item in backlog
            if int(item.get("evidence_count") or 0) < 5 or float(item.get("confidence_score") or 0) < 45
        ][:8]
        roadmap = {
            "user_id": user_id,
            "project_id": project_id,
            "product_review_run_id": product_review_run_id,
            "title": title or "Product Intelligence Roadmap",
            "summary": (
                "Roadmap generated from approved and candidate backlog items. "
                "Items are planning candidates, not automatic implementation instructions."
            ),
            "now_items": now_items,
            "next_items": next_items,
            "later_items": later_items,
            "do_not_build_items": [self._roadmap_item(item) for item in do_not_build[:8]],
            "needs_more_evidence_items": needs_more_evidence,
        }
        return self.repository.insert("product_roadmaps", roadmap)

    def list_for_project(self, *, user_id: str, project_id: str, limit: int = 20) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "product_roadmaps",
            user_id=user_id,
            filters={"project_id": project_id},
            order="created_at.desc",
            limit=limit,
        )

    def latest_for_project(self, *, user_id: str, project_id: str) -> dict[str, Any]:
        rows = self.list_for_project(user_id=user_id, project_id=project_id, limit=1)
        if not rows:
            raise ValueError("No product roadmap was found.")
        return rows[0]

    def latest_context_for_project(self, *, user_id: str, project_id: str | None) -> dict[str, Any] | None:
        if not project_id:
            return None
        try:
            return self.latest_for_project(user_id=user_id, project_id=project_id)
        except ValueError:
            return None

    @staticmethod
    def _roadmap_item(item: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": item.get("id"),
            "title": item.get("title"),
            "priority": item.get("priority"),
            "status": item.get("status"),
            "impact_score": item.get("impact_score"),
            "cost_score": item.get("cost_score"),
            "confidence_score": item.get("confidence_score"),
            "evidence_count": item.get("evidence_count"),
            "target_area": item.get("target_area"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
