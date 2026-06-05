from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.services.supabase.supabase_repository import SupabaseRepository


class DemandDiscoveryService:
    """Chat-first facade for idea and market direction discovery."""

    def __init__(self, repository: SupabaseRepository) -> None:
        self.repository = repository

    def list_sessions(self, *, user_id: str) -> list[dict[str, Any]]:
        return [
            self._serialize(row)
            for row in self.repository.get_many(
                "demand_discovery_sessions",
                user_id=user_id,
                order="updated_at.desc",
                limit=50,
            )
        ]

    def create_session(self, *, user_id: str, input_text: str) -> dict[str, Any]:
        insight = self.analyze(input_text=input_text)
        assistant_response = self.assistant_message(insight)
        session = self.repository.insert(
            "demand_discovery_sessions",
            {
                "user_id": user_id,
                "title": _title(input_text),
                "last_input": input_text,
                "last_assistant_response": assistant_response,
                "messages": [
                    {"role": "user", "content": input_text},
                    {"role": "assistant", "content": assistant_response},
                ],
                "insight": insight,
            },
        )
        return self._serialize(session)

    def get_session(self, *, user_id: str, session_id: str) -> dict[str, Any]:
        session = self.repository.get_one(
            "demand_discovery_sessions",
            user_id=user_id,
            filters={"id": session_id},
        )
        return self._serialize(session)

    def add_message(self, *, user_id: str, session_id: str, input_text: str) -> dict[str, Any]:
        session = self.repository.get_one(
            "demand_discovery_sessions",
            user_id=user_id,
            filters={"id": session_id},
        )
        insight = self.analyze(input_text=input_text)
        assistant_response = self.assistant_message(insight)
        messages = _message_list(session.get("messages"))
        messages.extend(
            [
                {"role": "user", "content": input_text},
                {"role": "assistant", "content": assistant_response},
            ]
        )
        updated = self.repository.update(
            "demand_discovery_sessions",
            user_id=user_id,
            filters={"id": session_id},
            payload={
                "last_input": input_text,
                "last_assistant_response": assistant_response,
                "messages": messages,
                "insight": insight,
            },
        )
        return self._serialize(updated)

    def analyze(self, *, input_text: str) -> dict[str, Any]:
        normalized = " ".join(input_text.split())
        if not normalized:
            raise ValueError("Input is required.")

        keywords = _keywords(normalized)
        primary = keywords[0] if keywords else "the idea"
        secondary = keywords[1] if len(keywords) > 1 else "target users"
        competitor = keywords[2] if len(keywords) > 2 else "existing alternatives"

        return {
            "summary": f"{normalized[:160]}{'...' if len(normalized) > 160 else ''}",
            "marketSignals": [
                f"Users may already be searching for a simpler way to handle {primary}.",
                f"Repeated pains around {secondary} should be validated with real evidence before positioning.",
                "Treat this as decision support, not proof of demand or revenue.",
            ],
            "competitors": [
                f"Compare against {competitor} and adjacent manual workflows.",
                "Look for complaints about setup effort, trust, pricing, and switching cost.",
            ],
            "opportunity": f"Position the idea around a narrow, painful workflow where {primary} and measurable outcomes connect clearly.",
            "risks": [
                "The market may be too broad if the first user segment is not explicit.",
                "AI-generated claims should be reviewed before becoming ad or LP copy.",
                "Search and market-size signals are directional unless connected to real source data.",
            ],
            "suggestedDirection": "Start with one target segment, one painful job, one proof point, and one testable landing page angle.",
            "nextActions": [
                "Run a focused evidence scan for the first target segment.",
                "List direct and indirect competitors with their main promise.",
                "Convert the strongest pain into one ad angle and one LP hero.",
                "If the direction is promising, create an Ad Optimization project.",
            ],
        }

    def assistant_message(self, insight: dict[str, Any]) -> str:
        return (
            f"Summary: {insight['summary']}\n\n"
            f"Opportunity: {insight['opportunity']}\n\n"
            f"Suggested Direction: {insight['suggestedDirection']}\n\n"
            f"Next Actions:\n- " + "\n- ".join(insight["nextActions"])
        )

    def _serialize(self, session: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": session["id"],
            "title": session["title"],
            "messages": _message_list(session.get("messages")),
            "insight": session.get("insight"),
            "created_at": session["created_at"],
            "updated_at": session["updated_at"],
        }


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _title(input_text: str) -> str:
    return input_text.strip().splitlines()[0][:80] or "Demand Discovery Session"


def _keywords(input_text: str) -> list[str]:
    stopwords = {
        "the",
        "and",
        "for",
        "with",
        "that",
        "this",
        "from",
        "into",
        "about",
        "ます",
        "です",
        "する",
        "したい",
        "ため",
        "向け",
    }
    words = [
        word.strip(".,!?;:()[]{}\"'`").lower()
        for word in input_text.replace("、", " ").replace("。", " ").split()
    ]
    unique: list[str] = []
    for word in words:
        if len(word) < 3 or word in stopwords or word in unique:
            continue
        unique.append(word)
    return unique[:8]


def _message_list(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    messages: list[dict[str, str]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content")
        if role in {"user", "assistant"} and isinstance(content, str):
            messages.append({"role": role, "content": content})
    return messages
