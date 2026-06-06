from __future__ import annotations

import os
from typing import Any

from pydantic import BaseModel

from backend.services.ai.openai_json_client import OpenAIJSONClient
from backend.services.ai.providers.mock_provider import MockProvider


class OpenAIProvider:
    provider_key = "openai"

    def __init__(self, *, model: str | None) -> None:
        self.model = model
        self.fallback = MockProvider()

    def is_configured(self) -> bool:
        return bool(os.getenv("OPENAI_API_KEY") and self.model)

    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
        schema: dict[str, Any],
        response_model: type[BaseModel] | None = None,
    ) -> dict[str, Any]:
        strict_openai = user_payload.get("ai_mode") == "openai_only"
        if not self.is_configured() or response_model is None or self.model is None:
            if strict_openai:
                raise ValueError("OPENAI_API_KEY and OPENAI_FAST_MODEL or OPENAI_MODEL are required for OpenAI-only orchestration.")
            return self.fallback.generate_structured(
                system_prompt=system_prompt,
                user_payload={**user_payload, "provider": self.provider_key},
                schema=schema,
                response_model=response_model,
            )
        try:
            return OpenAIJSONClient(model=self.model).generate_json(
                system_prompt=system_prompt,
                user_payload={**user_payload, "provider": self.provider_key},
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
