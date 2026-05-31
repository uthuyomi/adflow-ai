from __future__ import annotations

import os
from typing import Any

from pydantic import BaseModel

from backend.services.ai.openai_json_client import OpenAIJSONClient
from backend.services.ai.providers.mock_provider import MockProvider


class OpenAIProvider:
    provider_key = "openai"

    def __init__(self, *, fast_model: str | None, deep_model: str | None) -> None:
        self.fast_model = fast_model
        self.deep_model = deep_model or fast_model
        self.fallback = MockProvider()

    def is_configured(self) -> bool:
        return bool(os.getenv("OPENAI_API_KEY") and (self.fast_model or self.deep_model))

    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
        schema: dict[str, Any],
        response_model: type[BaseModel] | None = None,
    ) -> dict[str, Any]:
        strict_openai = user_payload.get("ai_mode") == "openai_only"
        model = self._model_for(user_payload)
        if not self.is_configured() or response_model is None or model is None:
            if strict_openai:
                raise ValueError("OPENAI_API_KEY and OPENAI_FAST_MODEL or OPENAI_DEEP_MODEL are required for OpenAI-only orchestration.")
            return self.fallback.generate_structured(
                system_prompt=system_prompt,
                user_payload={**user_payload, "provider": self.provider_key},
                schema=schema,
                response_model=response_model,
            )
        try:
            return OpenAIJSONClient(model=model).generate_json(
                system_prompt=system_prompt,
                user_payload={**user_payload, "provider": self.provider_key, "openai_model_tier": self._tier_for(user_payload)},
                response_model=response_model,
            )
        except Exception:
            if strict_openai:
                raise
            return self.fallback.generate_structured(
                system_prompt=system_prompt,
                user_payload={**user_payload, "provider": self.provider_key},
                schema=schema,
                response_model=response_model,
            )

    def _tier_for(self, user_payload: dict[str, Any]) -> str:
        task = str(user_payload.get("task") or "").lower()
        if "risk" in task or "review" in task or "implementation" in task or task in {
            "analytics_diagnosis",
            "openai_lp_review",
            "openai_risk_review",
            "openai_implementation_plan",
        }:
            return "deep"
        return "fast"

    def _model_for(self, user_payload: dict[str, Any]) -> str | None:
        if self._tier_for(user_payload) == "deep":
            return self.deep_model or self.fast_model
        return self.fast_model or self.deep_model
