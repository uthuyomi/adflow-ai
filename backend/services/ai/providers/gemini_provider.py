from __future__ import annotations

import json
from typing import Any

import requests

from backend.services.ai.providers.mock_provider import MockProvider


class GeminiProvider:
    provider_key = "gemini"

    def __init__(self, *, api_key: str | None, model: str | None) -> None:
        self.api_key = api_key
        self.model = model or "gemini-2.5-flash"
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
                user_payload={**user_payload, "provider": self.provider_key, "failure_reason": "Gemini is not configured."},
                schema=schema,
            )
        try:
            response = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
                params={"key": self.api_key},
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [
                        {
                            "role": "user",
                            "parts": [
                                {
                                    "text": f"{system_prompt}\n\nPayload:\n{json.dumps(user_payload, ensure_ascii=False)}",
                                },
                            ],
                        },
                    ],
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "responseJsonSchema": schema,
                    },
                },
                timeout=45,
            )
            response.raise_for_status()
            text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
            return {**json.loads(text), "provider_type": "REAL", "failure_reason": None, "source_provider": self.provider_key}
        except Exception as exc:
            return self.fallback.generate_structured(
                system_prompt=system_prompt,
                user_payload={**user_payload, "provider": self.provider_key, "failure_reason": f"Gemini request failed: {type(exc).__name__}"},
                schema=schema,
            )
