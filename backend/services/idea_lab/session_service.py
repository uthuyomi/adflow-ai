from __future__ import annotations

from typing import Any

from backend.services.idea_lab.models import IdeaSessionCreateRequest
from backend.services.supabase.supabase_repository import SupabaseRepository


class IdeaSessionService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository

    def create(self, *, user_id: str, request: IdeaSessionCreateRequest) -> dict[str, Any]:
        session = self.repository.insert(
            "idea_sessions",
            {
                "user_id": user_id,
                "project_id": request.project_id,
                "title": request.title or "Untitled idea",
                "status": "active",
                "memory": {},
            },
        )
        if request.initial_message:
            self.repository.insert(
                "idea_messages",
                {"user_id": user_id, "session_id": session["id"], "role": "user", "content": request.initial_message},
            )
        return self.get(user_id=user_id, session_id=session["id"])

    def list(self, *, user_id: str, limit: int = 50) -> list[dict[str, Any]]:
        return self.repository.get_many("idea_sessions", user_id=user_id, order="updated_at.desc", limit=limit)

    def get(self, *, user_id: str, session_id: str) -> dict[str, Any]:
        session = self.repository.get_one("idea_sessions", user_id=user_id, filters={"id": session_id})
        profile = self._profile(user_id=user_id, session_id=session_id)
        latest_review = self._latest("idea_review_runs", user_id=user_id, session_id=session_id)
        roadmap = self._latest("idea_roadmaps", user_id=user_id, session_id=session_id)
        return {**session, "profile": profile, "latest_review": latest_review, "roadmap": roadmap}

    def messages(self, *, user_id: str, session_id: str) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "idea_messages",
            user_id=user_id,
            filters={"session_id": session_id},
            order="created_at.asc",
            limit=200,
        )

    def _profile(self, *, user_id: str, session_id: str) -> dict[str, Any] | None:
        rows = self.repository.get_many("idea_profiles", user_id=user_id, filters={"session_id": session_id}, limit=1)
        return rows[0] if rows else None

    def _latest(self, table: str, *, user_id: str, session_id: str) -> dict[str, Any] | None:
        rows = self.repository.get_many(table, user_id=user_id, filters={"session_id": session_id}, order="created_at.desc", limit=1)
        return rows[0] if rows else None
