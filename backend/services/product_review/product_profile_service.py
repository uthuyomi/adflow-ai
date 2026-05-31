from __future__ import annotations

from typing import Any

from backend.services.product_review.models import ProductProfilePayload, ProductProfileUpdate
from backend.services.supabase.supabase_repository import SupabaseRepository


class ProductProfileService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository

    def get_by_project(self, *, user_id: str, project_id: str) -> dict[str, Any] | None:
        rows = self.repository.get_many(
            "product_profiles",
            user_id=user_id,
            filters={"project_id": project_id},
            order="updated_at.desc",
            limit=1,
        )
        return rows[0] if rows else None

    def upsert(self, *, user_id: str, payload: ProductProfilePayload) -> dict[str, Any]:
        existing = self.get_by_project(user_id=user_id, project_id=payload.project_id)
        data = {"user_id": user_id, **payload.model_dump(mode="json")}
        if existing:
            return self.repository.update(
                "product_profiles",
                user_id=user_id,
                filters={"id": existing["id"]},
                payload=payload.model_dump(mode="json"),
            )
        return self.repository.insert("product_profiles", data)

    def update(self, *, user_id: str, profile_id: str, payload: ProductProfileUpdate) -> dict[str, Any]:
        data = payload.model_dump(mode="json", exclude_unset=True)
        return self.repository.update("product_profiles", user_id=user_id, filters={"id": profile_id}, payload=data)
