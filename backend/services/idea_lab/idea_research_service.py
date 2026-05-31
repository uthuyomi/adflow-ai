from __future__ import annotations

from typing import Any

from backend.services.evidence.evidence_service import EvidenceService
from backend.services.evidence.models import EvidenceCollectionRequest
from backend.services.supabase.supabase_repository import SupabaseRepository


class IdeaResearchService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository
        self.evidence_service = EvidenceService(repository=repository)

    def collect(self, *, user_id: str, session_id: str, query: str, max_items: int = 100) -> dict[str, Any]:
        return self.evidence_service.collect(
            user_id=user_id,
            request=EvidenceCollectionRequest(
                project_id=None,
                idea_session_id=session_id,
                query=query,
                sources=[
                    "mock",
                    "web_stub",
                    "search_stub",
                    "competitor_stub",
                    "review_stub",
                    "reddit_stub",
                    "twitter_stub",
                    "youtube_stub",
                    "github_stub",
                ],
                max_items=max_items,
            ),
        ).model_dump(mode="json")

    def clusters(self, *, user_id: str, session_id: str) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "evidence_clusters",
            user_id=user_id,
            filters={"idea_session_id": session_id},
            order="evidence_count.desc",
            limit=50,
        )
