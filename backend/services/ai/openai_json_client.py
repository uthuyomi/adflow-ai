from __future__ import annotations

import json
from typing import Any

from openai import OpenAI, OpenAIError
from pydantic import BaseModel


class OpenAIJSONClient:
    provider_type = "REAL"
    source_provider = "openai"
    failure_reason = None

    def __init__(self, *, model: str) -> None:
        self.client = OpenAI()
        self.model = model

    def generate_json(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
        response_model: type[BaseModel],
    ) -> dict[str, Any]:
        try:
            response = self.client.responses.parse(
                model=self.model,
                input=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": (
                            "Use this JSON payload as the only source data:\n"
                            f"{json.dumps(user_payload, ensure_ascii=False)}"
                        ),
                    },
                ],
                text_format=response_model,
            )
        except OpenAIError as exc:
            raise ValueError(f"OpenAI structured output request failed: {exc}") from exc
        parsed = response.output_parsed
        if parsed is None:
            raise ValueError("OpenAI response did not include parsed structured output.")

        return parsed.model_dump()
