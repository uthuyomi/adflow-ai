from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.services.idea_lab.idea_parser_service import IdeaParserService
from backend.services.idea_lab.models import IdeaChatRequest, IdeaSessionCreateRequest
from backend.services.idea_lab.session_service import IdeaSessionService
from backend.services.supabase.supabase_repository import SupabaseRepository


class IdeaChatService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository
        self.sessions = IdeaSessionService(repository=repository)
        self.parser = IdeaParserService()

    def chat(self, *, user_id: str, request: IdeaChatRequest) -> dict[str, Any]:
        session_id = request.session_id
        if not session_id:
            session = self.sessions.create(
                user_id=user_id,
                request=IdeaSessionCreateRequest(title=request.message[:70], initial_message=None),
            )
            session_id = session["id"]
        self.repository.insert(
            "idea_messages",
            {"user_id": user_id, "session_id": session_id, "role": "user", "content": request.message},
        )
        messages = self.sessions.messages(user_id=user_id, session_id=session_id)
        existing_profile = self.sessions.get(user_id=user_id, session_id=session_id).get("profile")
        profile_payload = self.parser.parse(messages=messages, existing_profile=existing_profile)
        profile = self._upsert_profile(user_id=user_id, session_id=session_id, payload=profile_payload)
        assistant_text = self._assistant_reply(profile)
        assistant_message = self.repository.insert(
            "idea_messages",
            {
                "user_id": user_id,
                "session_id": session_id,
                "role": "assistant",
                "content": assistant_text,
                "metadata": {"profile_snapshot": profile},
            },
        )
        self.repository.update(
            "idea_sessions",
            user_id=user_id,
            filters={"id": session_id},
            payload={
                "title": profile.get("title") or request.message[:70],
                "memory": {
                    "conversation_history": len(messages) + 1,
                    "idea_profile": profile,
                    "decision_history": [],
                },
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        return {"session": self.sessions.get(user_id=user_id, session_id=session_id), "message": assistant_message}

    def _upsert_profile(self, *, user_id: str, session_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        rows = self.repository.get_many("idea_profiles", user_id=user_id, filters={"session_id": session_id}, limit=1)
        data = {**payload, "updated_at": datetime.now(timezone.utc).isoformat()}
        if rows:
            return self.repository.update("idea_profiles", user_id=user_id, filters={"id": rows[0]["id"]}, payload=data)
        return self.repository.insert("idea_profiles", {"user_id": user_id, "session_id": session_id, **payload})

    @staticmethod
    def _assistant_reply(profile: dict[str, Any]) -> str:
        return (
            "整理したよ。現時点では、問題は "
            f"「{profile.get('problem_statement')}」、対象は「{profile.get('target_users')}」、"
            f"解決策は「{profile.get('proposed_solution')}」として扱える。"
            " 次はEvidence収集とIdea Reviewで、Build / Maybe / Avoidを判断材料として出せるよ。"
        )
