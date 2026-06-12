from __future__ import annotations

import json
from typing import Any

import requests

from backend.services.ai.providers.mock_provider import MockProvider


class GrokProvider:
    provider_key = "grok"

    def __init__(self, *, api_key: str | None, model: str | None) -> None:
        self.api_key = api_key
        self.model = model or "grok-4"
        self.fallback = MockProvider()

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
        schema: dict[str, Any],
        response_model: type[Any] | None = None,
    ) -> dict[str, Any]:
        if not self.is_configured():
            return self.fallback.generate_structured(
                system_prompt=system_prompt,
                user_payload={**user_payload, "provider": self.provider_key, "failure_reason": "Grok is not configured."},
                schema=schema,
            )
        try:
            response = requests.post(
                "https://api.x.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
                    ],
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": "agent_output",
                            "schema": schema,
                            "strict": True,
                        },
                    },
                },
                timeout=45,
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            return {**json.loads(content), "provider_type": "REAL", "failure_reason": None, "source_provider": self.provider_key}
        except Exception as exc:
            return self.fallback.generate_structured(
                system_prompt=system_prompt,
                user_payload={**user_payload, "provider": self.provider_key, "failure_reason": f"Grok request failed: {type(exc).__name__}"},
                schema=schema,
            )
