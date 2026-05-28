from __future__ import annotations

from typing import Any

from backend.services.supabase.supabase_repository import SupabaseRepository


class ChangeHistoryService:
    def __init__(self, repository: SupabaseRepository) -> None:
        self.repository = repository

    def list_for_pair(
        self,
        *,
        user_id: str,
        pair: dict[str, Any],
    ) -> list[dict[str, Any]]:
        entity_ids = [pair["id"], pair["twitter_ad_id"], pair["landing_page_id"]]
        return self.repository.get_many(
            "change_history",
            user_id=user_id,
            filters={"entity_id": entity_ids},
            order="created_at.desc",
        )

    @staticmethod
    def summarize_change(before: dict[str, Any] | None, after: dict[str, Any] | None) -> str:
        if before is None and after is not None:
            return f"Created {after.get('name', after.get('id', 'record'))}"
        if before is not None and after is None:
            return f"Deleted {before.get('name', before.get('id', 'record'))}"
        if before and after:
            changed = [key for key in after if before.get(key) != after.get(key)]
            return f"Updated {after.get('name', after.get('id', 'record'))}: {', '.join(changed[:8])}"
        return "Changed record"
