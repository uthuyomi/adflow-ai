from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
import re
from typing import Any, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field

from backend.services.ai.openai_json_client import OpenAIJSONClient
from backend.services.demand.demand_intelligence_service import DemandIntelligenceService
from backend.services.supabase.supabase_repository import SupabaseRepository

ResearchStatus = Literal[
    "conversation",
    "clarification_required",
    "research_recommended",
    "research_running",
    "research_completed",
    "research_failed",
]


class DemandDiscoveryAIResponse(BaseModel):
    assistant_message: str = Field(description="A natural conversational reply to the user.")
    summary: str
    marketSignals: list[str] = Field(default_factory=list)
    competitors: list[str] = Field(default_factory=list)
    opportunity: str = ""
    risks: list[str] = Field(default_factory=list)
    suggestedDirection: str = ""
    nextActions: list[str] = Field(default_factory=list)
    chat_state: ResearchStatus = "conversation"
    missing_fields: list[str] = Field(default_factory=list)
    research_recommended: bool = False
    research_brief: dict[str, Any] = Field(default_factory=dict)


class DemandDiscoveryService:
    """Chat-first facade that can explicitly launch evidence-backed demand research."""

    def __init__(
        self,
        repository: SupabaseRepository,
        llm_client: OpenAIJSONClient | None = None,
        demand_intelligence_service: DemandIntelligenceService | None = None,
    ) -> None:
        self.repository = repository
        self.llm_client = llm_client
        self.demand_intelligence_service = demand_intelligence_service

    def list_sessions(
        self,
        *,
        user_id: str,
        project_id: str | None = None,
        status: str | None = None,
        favorite: bool | None = None,
        query: str | None = None,
    ) -> list[dict[str, Any]]:
        filters: dict[str, Any] = {}
        if project_id:
            filters["project_id"] = project_id
        if status:
            filters["status"] = status
        rows = [
            self._serialize(row)
            for row in self.repository.get_many(
                "demand_discovery_sessions",
                user_id=user_id,
                filters=filters,
                order="updated_at.desc",
                limit=100,
            )
        ]
        if favorite is not None:
            rows = [row for row in rows if row["is_favorite"] is favorite]
        if query:
            normalized = query.casefold()
            rows = [row for row in rows if normalized in row["title"].casefold() or normalized in row["query"].casefold()]
        return rows

    def create_session(self, *, user_id: str, input_text: str, locale: str = "ja", project_id: str | None = None) -> dict[str, Any]:
        result = self.analyze(input_text=input_text, messages=[], locale=locale)
        session = self.repository.insert(
            "demand_discovery_sessions",
            {
                "user_id": user_id,
                "project_id": project_id,
                "title": _title(input_text),
                "last_input": input_text,
                "last_assistant_response": result["assistant_message"],
                "messages": [
                    {"role": "user", "content": input_text},
                    {"role": "assistant", "content": result["assistant_message"]},
                ],
                "insight": result["insight"],
                "research_status": result["research_status"],
                "research_brief": result["research_brief"],
            },
        )
        return self._serialize(session)

    def update_session(
        self,
        *,
        user_id: str,
        session_id: str,
        title: str | None = None,
        project_id: str | None = None,
        status: str | None = None,
        is_favorite: bool | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {}
        if title is not None:
            payload["title"] = title.strip()
        if project_id is not None:
            payload["project_id"] = project_id or None
        if status is not None:
            if status not in {"active", "archived", "deleted"}:
                raise ValueError("Invalid discovery session status.")
            payload["status"] = status
            payload["deleted_at"] = _now() if status == "deleted" else None
        if is_favorite is not None:
            payload["is_favorite"] = is_favorite
        return self._serialize(self.repository.update("demand_discovery_sessions", user_id=user_id, filters={"id": session_id}, payload=payload))

    def get_session(self, *, user_id: str, session_id: str) -> dict[str, Any]:
        return self._serialize(
            self.repository.get_one("demand_discovery_sessions", user_id=user_id, filters={"id": session_id}),
        )

    def add_message(self, *, user_id: str, session_id: str, input_text: str, locale: str = "ja") -> dict[str, Any]:
        session = self.repository.get_one("demand_discovery_sessions", user_id=user_id, filters={"id": session_id})
        messages = _message_list(session.get("messages"))
        result = self.analyze(
            input_text=input_text,
            messages=messages,
            locale=locale,
            research_context=session.get("research_context") or {},
        )
        messages.extend(
            [
                {"role": "user", "content": input_text},
                {"role": "assistant", "content": result["assistant_message"]},
            ]
        )
        updated = self.repository.update(
            "demand_discovery_sessions",
            user_id=user_id,
            filters={"id": session_id},
            payload={
                "last_input": input_text,
                "last_assistant_response": result["assistant_message"],
                "messages": messages,
                "insight": result["insight"],
                "research_status": result["research_status"],
                "research_brief": _merge_briefs(session.get("research_brief"), result["research_brief"]),
            },
        )
        return self._serialize(updated)

    def run_research(
        self,
        *,
        user_id: str,
        session_id: str,
        locale: str = "ja",
        force: bool = False,
        source_urls: list[str] | None = None,
    ) -> tuple[dict[str, Any], bool]:
        if self.demand_intelligence_service is None:
            raise ValueError("Demand Intelligence is not configured.")
        session = self.repository.get_one("demand_discovery_sessions", user_id=user_id, filters={"id": session_id})
        brief = _normalized_brief(session.get("research_brief"), session.get("last_input"))
        resolved_source_urls = list(dict.fromkeys([*(source_urls or []), *_urls_from_messages(session.get("messages"))]))
        fingerprint = _research_fingerprint(brief, resolved_source_urls)

        if not force and session.get("latest_demand_run_id"):
            latest = self.demand_intelligence_service.get_run(user_id=user_id, run_id=session["latest_demand_run_id"])
            if latest.get("research_fingerprint") == fingerprint and latest.get("status") == "completed":
                return self._serialize(session), True

        recent_requests = self.repository.get_many(
            "demand_research_requests",
            user_id=user_id,
            order="created_at.desc",
            limit=10,
        )
        if any(
            item.get("research_fingerprint") == fingerprint
            and item.get("status") == "running"
            and _is_recent(item.get("created_at"), seconds=600)
            for item in recent_requests
        ):
            raise ValueError("RESEARCH_ALREADY_RUNNING")
        if sum(1 for item in recent_requests if _is_recent(item.get("created_at"), seconds=60)) >= 3:
            raise ValueError("RESEARCH_RATE_LIMITED")

        request_row = self.repository.insert(
            "demand_research_requests",
            {
                "user_id": user_id,
                "discovery_session_id": session_id,
                "research_fingerprint": fingerprint,
                "status": "running",
            },
        )
        self.repository.update(
            "demand_discovery_sessions",
            user_id=user_id,
            filters={"id": session_id},
            payload={"research_status": "research_running", "research_requested_at": _now()},
        )
        try:
            run = self.demand_intelligence_service.run(
                user_id=user_id,
                mode="discovery",
                discovery_session_id=session_id,
                scope_type=brief["scope_type"],
                target_segment=brief["target_segment"],
                problem_statement=brief["problem_statement"],
                product_idea=brief["product_idea"],
                research_query=brief["research_query"],
                research_fingerprint=fingerprint,
                query=brief["research_query"],
                locale=locale,
                source_urls=resolved_source_urls,
            )
            research_context = _research_context(run)
            grounded = self.analyze(
                input_text=_grounded_request(locale),
                messages=_message_list(session.get("messages")),
                locale=locale,
                research_context=research_context,
            )
            messages = _message_list(session.get("messages"))
            messages.append({"role": "assistant", "content": grounded["assistant_message"]})
            updated = self.repository.update(
                "demand_discovery_sessions",
                user_id=user_id,
                filters={"id": session_id},
                payload={
                    "latest_demand_run_id": run["id"],
                    "research_status": "research_completed",
                    "research_context": research_context,
                    "research_completed_at": _now(),
                    "last_assistant_response": grounded["assistant_message"],
                    "messages": messages,
                    "insight": grounded["insight"],
                },
            )
            self.repository.update(
                "demand_research_requests",
                user_id=user_id,
                filters={"id": request_row["id"]},
                payload={"demand_run_id": run["id"], "status": "completed", "completed_at": _now()},
            )
            return self._serialize(updated), False
        except Exception as exc:
            self.repository.update(
                "demand_discovery_sessions",
                user_id=user_id,
                filters={"id": session_id},
                payload={"research_status": "research_failed"},
            )
            self.repository.update(
                "demand_research_requests",
                user_id=user_id,
                filters={"id": request_row["id"]},
                payload={"status": "failed", "error_message": str(exc), "completed_at": _now()},
            )
            raise

    def analyze(
        self,
        *,
        input_text: str,
        messages: list[dict[str, str]] | None = None,
        locale: str = "ja",
        research_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        normalized = " ".join(input_text.split())
        if not normalized:
            raise ValueError("Input is required.")
        fallback_brief = _brief_from_text(normalized)
        if self.llm_client is not None:
            try:
                generated = self.llm_client.generate_json(
                    system_prompt=_system_prompt(locale),
                    user_payload={
                        "locale": locale,
                        "current_user_message": normalized,
                        "conversation_history": (messages or [])[-12:],
                        "research_context": research_context or {},
                    },
                    response_model=DemandDiscoveryAIResponse,
                )
                brief = _merge_briefs(fallback_brief, generated.get("research_brief"))
                status = _status_from_generated(generated, brief, research_context or {})
                return {
                    "assistant_message": str(generated["assistant_message"]),
                    "insight": _insight_from_generated(generated),
                    "research_status": status,
                    "research_brief": brief,
                }
            except Exception as exc:
                return self._transparent_fallback(normalized, locale, fallback_brief, str(exc), research_context or {})
        return self._transparent_fallback(normalized, locale, fallback_brief, "AI model is not configured.", research_context or {})

    def _transparent_fallback(
        self,
        text: str,
        locale: str,
        brief: dict[str, Any],
        reason: str,
        research_context: dict[str, Any],
    ) -> dict[str, Any]:
        missing = _missing_fields(brief)
        clusters = research_context.get("top_pain_clusters") or []
        if research_context:
            status: ResearchStatus = "research_completed"
            top_lines = [
                f"{item.get('name')}: demand {round(float(item.get('demand_signal_score') or 0))}, validation {round(float(item.get('validation_score') or 0))}"
                for item in clusters[:3]
            ]
            if locale == "ja":
                message = (
                    "AIによる文章生成は利用できませんでしたが、需要調査の取得済み根拠を表示します。"
                    f"\n\nデータ種別: {research_context.get('source_kind', 'none')}"
                    f"\n参照シグナル数: {research_context.get('signal_count', 0)}"
                    f"\n\n強い不満候補:\n- " + ("\n- ".join(top_lines) if top_lines else "十分な不満クラスターは見つかりませんでした。")
                )
            else:
                message = (
                    "AI-written analysis was unavailable, but the collected demand evidence is shown below."
                    f"\n\nData type: {research_context.get('source_kind', 'none')}"
                    f"\nSignals: {research_context.get('signal_count', 0)}"
                    f"\n\nTop pain candidates:\n- " + ("\n- ".join(top_lines) if top_lines else "No sufficiently strong pain clusters were found.")
                )
        elif locale == "ja":
            status = "clarification_required" if missing else "research_recommended"
            message = (
                "AI相談応答を生成できなかったため、入力内容だけから調査条件を整理しました。"
                f"\n\n現在の状態: {'追加情報が必要です' if missing else '需要調査を実行できます'}"
                f"\n不足項目: {', '.join(missing) if missing else 'なし'}"
            )
        else:
            status = "clarification_required" if missing else "research_recommended"
            message = (
                "The AI conversation response was unavailable, so I only prepared research conditions from your input."
                f"\n\nStatus: {'More details are required' if missing else 'Demand research is ready'}"
                f"\nMissing: {', '.join(missing) if missing else 'none'}"
            )
        return {
            "assistant_message": message,
            "insight": {
                "summary": text[:200],
                "marketSignals": [],
                "competitors": [],
                "opportunity": "",
                "risks": [f"AI response unavailable: {reason}"],
                "suggestedDirection": "",
                "nextActions": ["Provide the missing research details." if missing else "Run demand research."],
            },
            "research_status": status,
            "research_brief": brief,
        }

    def _serialize(self, session: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": session["id"],
            "title": session["title"],
            "query": session.get("last_input") or "",
            "project_id": session.get("project_id"),
            "status": session.get("status") or "active",
            "is_favorite": bool(session.get("is_favorite")),
            "messages": _message_list(session.get("messages")),
            "insight": session.get("insight"),
            "latest_demand_run_id": session.get("latest_demand_run_id"),
            "research_status": session.get("research_status") or "conversation",
            "research_context": session.get("research_context") or {},
            "research_brief": session.get("research_brief") or {},
            "created_at": session["created_at"],
            "updated_at": session["updated_at"],
        }


def _system_prompt(locale: str) -> str:
    language = "Japanese" if locale == "ja" else "English"
    return (
        "You are AdFlow AI's demand discovery chat. "
        f"Reply in {language} as a helpful conversational assistant. "
        "First clarify the product idea, target segment, and painful problem. "
        "Never launch research yourself; only recommend research when the brief is usable. "
        "When research_context is present, ground every demand claim in it. "
        "Demand score measures signal strength; validation score measures evidence reliability. Never mix them. "
        "Never describe synthetic evidence as real-world evidence. Explicitly state when evidence is insufficient. "
        "Never guarantee demand, sales, conversions, or market success. "
        "Fill research_brief with scope_type, target_segment, problem_statement, product_idea, and research_query."
    )


def _research_context(run: dict[str, Any]) -> dict[str, Any]:
    summary = run.get("summary") or {}
    signals = run.get("signals") or []
    clusters = run.get("clusters") or []
    real_signals = [item for item in signals if item.get("connector_key") != "synthetic"]
    synthetic_signals = [item for item in signals if item.get("connector_key") == "synthetic"]
    source_names = {
        (urlparse(str(item.get("url"))).hostname or item.get("source_name") or item.get("source_type"))
        for item in real_signals
        if item.get("url") or item.get("source_name") or item.get("source_type")
    }
    source_kind = "mixed" if real_signals and synthetic_signals else "real" if real_signals else "synthetic" if synthetic_signals else "none"
    evidence = [
        {
            "title": item.get("title"),
            "body": str(item.get("body") or "")[:300],
            "url": item.get("url"),
            "source_type": item.get("source_type"),
            "source_name": item.get("source_name"),
            "synthetic": item.get("connector_key") == "synthetic",
        }
        for item in signals[:12]
    ]
    return {
        "run_id": run.get("id"),
        "source_kind": source_kind,
        "top_pain_clusters": [item for item in clusters if item.get("cluster_type") == "pain"][:5],
        "top_desire_clusters": [item for item in clusters if item.get("cluster_type") == "desire"][:5],
        "validation_summary": run.get("validation_summary") or summary.get("validation_summary") or {},
        "competitor_gaps": summary.get("competitor_gaps") or [],
        "opportunities": summary.get("opportunities") or [],
        "evidence": (summary.get("real_evidence_summary") or {}).get("sources") or evidence,
        "demand_score": summary.get("demand_score_summary") or {},
        "competitors": summary.get("competitor_discovery_summary") or {},
        "learning_context": summary.get("learning_context") or {},
        "source_status": run.get("source_status_summary") or {},
        "signal_count": len(signals),
        "source_count": len(source_names),
        "real_signal_count": len(real_signals),
        "synthetic_signal_count": len(synthetic_signals),
    }


def _status_from_generated(generated: dict[str, Any], brief: dict[str, Any], research_context: dict[str, Any]) -> ResearchStatus:
    if research_context:
        return "research_completed"
    if _missing_fields(brief):
        return "clarification_required"
    if generated.get("research_recommended"):
        return "research_recommended"
    status = str(generated.get("chat_state") or "conversation")
    return status if status in {"conversation", "clarification_required", "research_recommended"} else "conversation"  # type: ignore[return-value]


def _brief_from_text(text: str) -> dict[str, Any]:
    target = ""
    target_match = re.search(
        r"(?:([^。！？\n]{1,60}向け)|(?:for|targeting|built for)\s+([^,.!?;\n]{1,80}))",
        text,
        flags=re.I,
    )
    if target_match:
        target = next((group.strip() for group in target_match.groups() if group), "")
    return {
        "scope_type": "product_idea",
        "target_segment": target,
        "problem_statement": text,
        "product_idea": text,
        "research_query": text,
    }


def _normalized_brief(value: Any, fallback: Any) -> dict[str, str]:
    return _merge_briefs(_brief_from_text(str(fallback or "")), value)


def _merge_briefs(first: Any, second: Any) -> dict[str, str]:
    left = first if isinstance(first, dict) else {}
    right = second if isinstance(second, dict) else {}
    return {
        key: str(right.get(key) or left.get(key) or "").strip()
        for key in ["scope_type", "target_segment", "problem_statement", "product_idea", "research_query"]
    }


def _missing_fields(brief: dict[str, Any]) -> list[str]:
    return [key for key in ["product_idea", "target_segment", "problem_statement"] if not str(brief.get(key) or "").strip()]


def _research_fingerprint(brief: dict[str, Any], source_urls: list[str]) -> str:
    text = "|".join(str(brief.get(key) or "").strip().lower() for key in sorted(brief))
    return sha256(f"{text}|{'|'.join(sorted(source_urls))}".encode("utf-8")).hexdigest()


def _urls_from_messages(messages: Any) -> list[str]:
    urls: list[str] = []
    for message in _message_list(messages):
        urls.extend(re.findall(r"https?://[^\s<>()]+", message["content"]))
    return [url.rstrip(".,、。)") for url in urls]


def _grounded_request(locale: str) -> str:
    return (
        "調査結果を根拠に、需要の可能性、強い不満、信頼度、注意点、次の検証を会話形式で説明してください。"
        if locale == "ja"
        else "Explain the demand potential, strongest pains, evidence reliability, caveats, and next validation steps from the research."
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


def _message_list(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    return [
        {"role": str(item.get("role") or "assistant"), "content": str(item.get("content") or "")}
        for item in value
        if isinstance(item, dict)
    ]


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_recent(value: Any, *, seconds: int) -> bool:
    if not value:
        return False
    try:
        created = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - created).total_seconds() <= seconds
    except ValueError:
        return False


def _title(input_text: str) -> str:
    return input_text.strip().splitlines()[0][:80] or "Demand Discovery Session"
