from __future__ import annotations

import os
from typing import Any

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
    ) -> dict[str, Any]:
        # The existing OpenAIJSONClient handles workflow models. For orchestration,
        # keep a conservative fallback until provider-specific prompts are hardened.
        return self.fallback.generate_structured(
            system_prompt=system_prompt,
            user_payload={**user_payload, "provider": self.provider_key},
            schema=schema,
        )
