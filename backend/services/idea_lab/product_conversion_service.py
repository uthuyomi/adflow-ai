from __future__ import annotations

from typing import Any

from backend.services.idea_lab.models import ConvertToProductRequest
from backend.services.idea_lab.session_service import IdeaSessionService
from backend.services.product_review.product_profile_service import ProductProfileService
from backend.services.product_review.models import ProductProfilePayload
from backend.services.supabase.supabase_repository import SupabaseRepository


class ProductConversionService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository
        self.sessions = IdeaSessionService(repository=repository)
        self.product_profiles = ProductProfileService(repository=repository)

    def convert(self, *, user_id: str, request: ConvertToProductRequest) -> dict[str, Any]:
        session = self.sessions.get(user_id=user_id, session_id=request.session_id)
        profile = session.get("profile")
        if not profile:
            raise ValueError("Idea profile is required before conversion.")
        project_id = request.project_id or session.get("project_id")
        if not project_id:
            project = self.repository.insert(
                "ad_projects",
                {
                    "user_id": user_id,
                    "name": request.product_name or profile.get("title") or "Converted Idea Project",
                    "description": profile.get("problem_statement"),
                },
            )
            project_id = project["id"]
        product_profile = self.product_profiles.upsert(
            user_id=user_id,
            payload=ProductProfilePayload(
                project_id=project_id,
                product_name=request.product_name or profile.get("title") or "Converted Idea",
                short_description=profile.get("proposed_solution"),
                target_users=profile.get("target_users"),
                core_value=profile.get("problem_statement"),
                current_features=[],
                pricing_model=profile.get("monetization_model"),
                current_stage="idea",
                positioning_notes=profile.get("market_category"),
                known_constraints=profile.get("constraints"),
                do_not_build=[],
            ),
        )
        self.repository.update(
            "idea_sessions",
            user_id=user_id,
            filters={"id": request.session_id},
            payload={"project_id": project_id, "status": "converted"},
        )
        return {"project_id": project_id, "product_profile": product_profile, "next_step": "Run Product Review from the converted product profile."}
