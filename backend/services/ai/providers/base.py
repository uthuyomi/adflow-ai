from __future__ import annotations

from typing import Any, Protocol

from pydantic import BaseModel


class StructuredAIProvider(Protocol):
    provider_key: str

    def is_configured(self) -> bool:
        ...

    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
        schema: dict[str, Any],
        response_model: type[BaseModel] | None = None,
    ) -> dict[str, Any]:
        ...


def schema_for_agent_output() -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "summary": {"type": "string"},
            "findings": {"type": "array", "items": {"type": "string"}},
            "recommendations": {"type": "array", "items": {"type": "string"}},
            "score": {"type": ["number", "null"]},
            "risk_level": {"type": ["string", "null"], "enum": ["low", "medium", "high", None]},
            "next_action": {"type": ["string", "null"]},
            "confidence": {"type": ["number", "null"]},
            "predicted_effect": {
                "type": "object",
                "additionalProperties": True,
                "properties": {
                    "ctr_lift": {"type": ["number", "null"]},
                    "cvr_lift": {"type": ["number", "null"]},
                    "bounce_reduction": {"type": ["number", "null"]},
                    "notes": {"type": ["string", "null"]},
                },
            },
        },
        "required": [
            "summary",
            "findings",
            "recommendations",
            "score",
            "risk_level",
            "next_action",
            "confidence",
            "predicted_effect",
        ],
    }
