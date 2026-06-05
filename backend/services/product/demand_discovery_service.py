from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field

from backend.services.ai.openai_json_client import OpenAIJSONClient
from backend.services.supabase.supabase_repository import SupabaseRepository


class DemandDiscoveryAIResponse(BaseModel):
    assistant_message: str = Field(description="A natural conversational reply to the user.")
    summary: str
    marketSignals: list[str]
    competitors: list[str]
    opportunity: str
    risks: list[str]
    suggestedDirection: str
    nextActions: list[str]


class DemandDiscoveryService:
    """Chat-first facade for idea and market direction discovery."""

    def __init__(self, repository: SupabaseRepository, llm_client: OpenAIJSONClient | None = None) -> None:
        self.repository = repository
        self.llm_client = llm_client

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

    def create_session(self, *, user_id: str, input_text: str, locale: str = "ja") -> dict[str, Any]:
        result = self.analyze(input_text=input_text, messages=[], locale=locale)
        insight = result["insight"]
        assistant_response = result["assistant_message"]
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

    def add_message(self, *, user_id: str, session_id: str, input_text: str, locale: str = "ja") -> dict[str, Any]:
        session = self.repository.get_one(
            "demand_discovery_sessions",
            user_id=user_id,
            filters={"id": session_id},
        )
        messages = _message_list(session.get("messages"))
        result = self.analyze(input_text=input_text, messages=messages, locale=locale)
        insight = result["insight"]
        assistant_response = result["assistant_message"]
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

    def analyze(self, *, input_text: str, messages: list[dict[str, str]] | None = None, locale: str = "ja") -> dict[str, Any]:
        normalized = " ".join(input_text.split())
        if not normalized:
            raise ValueError("Input is required.")

        if self.llm_client is not None:
            try:
                generated = self.llm_client.generate_json(
                    system_prompt=_system_prompt(locale),
                    user_payload={
                        "locale": locale,
                        "current_user_message": normalized,
                        "conversation_history": (messages or [])[-12:],
                    },
                    response_model=DemandDiscoveryAIResponse,
                )
                return {
                    "assistant_message": str(generated["assistant_message"]),
                    "insight": _insight_from_generated(generated),
                }
            except Exception:
                # Keep the chat usable even if the model or key is temporarily unavailable.
                pass

        insight = self._fallback_insight(input_text=normalized, locale=locale)
        return {
            "assistant_message": self.assistant_message(insight, locale=locale),
            "insight": insight,
        }

    def _fallback_insight(self, *, input_text: str, locale: str) -> dict[str, Any]:
        normalized = " ".join(input_text.split())
        is_ja = locale == "ja" or _looks_japanese(normalized)
        keywords = _keywords(normalized)
        primary = keywords[0] if keywords else ("このアイデア" if is_ja else "the idea")
        secondary = keywords[1] if len(keywords) > 1 else ("対象ユーザー" if is_ja else "target users")
        competitor = keywords[2] if len(keywords) > 2 else ("既存の代替手段" if is_ja else "existing alternatives")

        if is_ja:
            return {
                "summary": normalized[:160] + ("..." if len(normalized) > 160 else ""),
                "marketSignals": [
                    f"{primary}について、ユーザーがどんな作業で困っているかを先に確認する必要があります。",
                    f"{secondary}の課題が繰り返し出ているか、レビュー、SNS、検索語、競合LPで検証してください。",
                    "これは需要や売上の保証ではなく、意思決定のための仮説整理です。",
                ],
                "competitors": [
                    f"{competitor}や手作業での代替フローと比較してください。",
                    "特に、導入の手間、信頼性、価格、乗り換えコストへの不満を探してください。",
                ],
                "opportunity": f"{primary}を、狭く痛みの強い業務と測定可能な成果に結びつけると訴求が作りやすくなります。",
                "risks": [
                    "対象セグメントが広すぎると、広告とLPのメッセージがぼやけます。",
                    "AIが作った表現は、広告やLPに使う前に根拠とリスクを確認してください。",
                    "検索需要や市場規模は、実データに接続するまでは参考値として扱ってください。",
                ],
                "suggestedDirection": "1つの対象ユーザー、1つの痛い課題、1つの証拠、1つのLPファーストビュー案に絞って検証してください。",
                "nextActions": [
                    "最初の対象セグメントを1つ決める。",
                    "そのユーザーが今使っている代替手段と不満を洗い出す。",
                    "一番強い痛みを広告角度とLPヒーローに変換する。",
                    "方向性が見えたら Ad Optimization で広告とLPをペア分析する。",
                ],
            }

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

    def assistant_message(self, insight: dict[str, Any], locale: str = "ja") -> str:
        if locale == "ja":
            return (
                f"もちろん相談できます。\n\n"
                f"まず見るべきポイントは「誰に、どんな約束をして、LPでその約束をどう証明するか」です。\n\n"
                f"概要: {insight['summary']}\n\n"
                f"機会: {insight['opportunity']}\n\n"
                f"おすすめの方向性: {insight['suggestedDirection']}\n\n"
                f"次のアクション:\n- " + "\n- ".join(insight["nextActions"])
            )
        return (
            f"Yes, I can help with that.\n\n"
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


def _system_prompt(locale: str) -> str:
    language = "Japanese" if locale == "ja" else "English"
    return (
        "You are AdFlow AI, a product, demand, ad, and landing page strategy assistant. "
        f"Reply in {language}. Behave like a helpful chat assistant, not a report generator. "
        "If the user's request is vague, answer helpfully and ask for the missing details. "
        "You help with product ideas, LP improvement, ad promise review, positioning, competitor gaps, and next experiments. "
        "Never claim guaranteed demand, revenue, conversion, or market success. "
        "Return concise but useful natural conversation in assistant_message, and also fill structured insight fields. "
        "Use the conversation history for context. Do not mix languages unless the user does."
    )


def _insight_from_generated(generated: dict[str, Any]) -> dict[str, Any]:
    return {
        "summary": str(generated.get("summary") or ""),
        "marketSignals": _string_list(generated.get("marketSignals")),
        "competitors": _string_list(generated.get("competitors")),
        "opportunity": str(generated.get("opportunity") or ""),
        "risks": _string_list(generated.get("risks")),
        "suggestedDirection": str(generated.get("suggestedDirection") or ""),
        "nextActions": _string_list(generated.get("nextActions")),
    }


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()]


def _looks_japanese(text: str) -> bool:
    return any("\u3040" <= char <= "\u30ff" or "\u4e00" <= char <= "\u9fff" for char in text)


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
        "これ",
        "それ",
        "ため",
        "向け",
        "について",
        "相談",
        "できる",
        "してください",
        "です",
        "ます",
    }
    normalized = (
        input_text.replace("、", " ")
        .replace("。", " ")
        .replace("？", " ")
        .replace("！", " ")
        .replace("／", " ")
        .replace("/", " ")
    )
    words = [word.strip(".,!?;:()[]{}\"'`").lower() for word in normalized.split()]
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
