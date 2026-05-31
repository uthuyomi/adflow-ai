from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.services.product_review.models import BacklogCandidate
from backend.services.supabase.supabase_repository import SupabaseRepository

VALID_STATUSES = {
    "candidate",
    "needs_review",
    "approved",
    "rejected",
    "deferred",
    "ready_for_codex",
    "converted_to_codex_task",
    "implemented",
    "measured",
}


class ProductBacklogService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository

    def create_from_candidates(
        self,
        *,
        user_id: str,
        project_id: str,
        ad_lp_pair_id: str | None,
        product_review_run_id: str,
        candidates: list[BacklogCandidate],
    ) -> list[dict[str, Any]]:
        return [
            self.repository.insert(
                "product_improvement_backlog",
                {
                    "user_id": user_id,
                    "project_id": project_id,
                    "ad_lp_pair_id": ad_lp_pair_id,
                    "product_review_run_id": product_review_run_id,
                    **self._payload(candidate),
                },
            )
            for candidate in candidates
        ]

    def list_for_project(self, *, user_id: str, project_id: str, limit: int = 100) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "product_improvement_backlog",
            user_id=user_id,
            filters={"project_id": project_id},
            order="created_at.desc",
            limit=limit,
        )

    def update(self, *, user_id: str, item_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        if "status" in payload and payload["status"] not in VALID_STATUSES:
            raise ValueError("Invalid backlog status.")
        return self.repository.update(
            "product_improvement_backlog",
            user_id=user_id,
            filters={"id": item_id},
            payload={**payload, "updated_at": datetime.now(timezone.utc).isoformat()},
        )

    def decide(self, *, user_id: str, item_id: str, status: str, reason: str | None = None) -> dict[str, Any]:
        if status not in VALID_STATUSES:
            raise ValueError("Invalid backlog status.")
        item = self.update(user_id=user_id, item_id=item_id, payload={"status": status})
        self.repository.insert(
            "change_history",
            {
                "user_id": user_id,
                "project_id": item.get("project_id"),
                "entity_type": "product_backlog_item",
                "entity_id": item_id,
                "action": f"decision:{status}",
                "before_data": None,
                "after_data": {"status": status},
                "summary": f"Product backlog item marked {status}: {item.get('title')}",
                "reason": reason,
            },
        )
        return item

    def convert_to_codex_task(self, *, user_id: str, item_id: str) -> dict[str, Any]:
        item = self.repository.get_one("product_improvement_backlog", user_id=user_id, filters={"id": item_id})
        if item.get("status") != "ready_for_codex":
            raise ValueError("Backlog item must be ready_for_codex before Codex task conversion.")
        prompt = self._codex_prompt(item)
        task = self.repository.insert(
            "codex_task_prompts",
            {
                "user_id": user_id,
                "project_id": item.get("project_id"),
                "source_ai_result_id": None,
                "title": item["title"][:80],
                "target_files_hint": item.get("affected_files_hint") or [],
                "implementation_goal": item.get("description") or item["title"],
                "constraints": prompt["constraints"],
                "acceptance_criteria": item.get("acceptance_criteria") or [],
                "prompt": prompt,
                "status": "draft",
            },
        )
        self.update(
            user_id=user_id,
            item_id=item_id,
            payload={"status": "converted_to_codex_task", "converted_codex_task_id": task["id"]},
        )
        return task

    @staticmethod
    def _payload(candidate: BacklogCandidate) -> dict[str, Any]:
        ratio = float(candidate.impact_score) / max(float(candidate.cost_score), 1)
        priority = _priority(candidate, ratio)
        return {
            **candidate.model_dump(mode="json"),
            "priority": priority,
            "status": "candidate",
            "impact_cost_ratio": round(ratio, 2),
            "source": "product_review",
        }

    @staticmethod
    def _codex_prompt(item: dict[str, Any]) -> dict[str, Any]:
        return {
            "title": item.get("title"),
            "background": item.get("description"),
            "evidence": {
                "evidence_count": item.get("evidence_count"),
                "evidence_cluster_ids": item.get("evidence_cluster_ids") or [],
                "rationale": item.get("rationale"),
            },
            "target_area": item.get("target_area"),
            "suggested_files": item.get("affected_files_hint") or [],
            "implementation_goal": item.get("description"),
            "constraints": [
                "Do not modify unrelated files.",
                "Do not change existing auth behavior.",
                "Do not break existing ad/LP analysis.",
                "Preserve current Supabase RLS assumptions.",
                "Keep UI consistent with existing Tailwind style.",
                "Add tests or at least build verification where possible.",
            ],
            "acceptance_criteria": item.get("acceptance_criteria") or [],
            "do_not_do": item.get("do_not_do"),
            "risk_notes": item.get("risk_notes"),
        }


def _priority(candidate: BacklogCandidate, ratio: float) -> str:
    impact = float(candidate.impact_score)
    cost = float(candidate.cost_score)
    confidence = float(candidate.confidence_score)
    evidence_count = int(candidate.evidence_count)
    if impact >= 85 and cost <= 35 and confidence >= 70 and evidence_count >= 50:
        return "critical"
    if impact >= 70 and cost <= 50 and confidence >= 60:
        return "high"
    if impact >= 50 and confidence >= 40:
        return "medium"
    return "low"
