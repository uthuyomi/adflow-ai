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
        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    "Use this JSON payload as the only source data:\n"
                    f"{json.dumps(user_payload, ensure_ascii=False)}"
                ),
            },
        ]
        try:
            response = self.client.responses.parse(
                model=self.model,
                input=messages,
                text_format=response_model,
            )
        except OpenAIError as exc:
            if getattr(exc, "code", None) == "invalid_json_schema":
                return self._generate_json_object(messages=messages, response_model=response_model)
            raise ValueError(f"OpenAI structured output request failed: {exc}") from exc
        parsed = response.output_parsed
        if parsed is None:
            raise ValueError("OpenAI response did not include parsed structured output.")

        return parsed.model_dump()

    def _generate_json_object(
        self,
        *,
        messages: list[dict[str, str]],
        response_model: type[BaseModel],
    ) -> dict[str, Any]:
        schema_message = {
            "role": "system",
            "content": (
                "Return exactly one JSON object that validates against this JSON Schema. "
                "Use every required property and do not add properties:\n"
                f"{json.dumps(response_model.model_json_schema(), ensure_ascii=False)}"
            ),
        }
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[*messages, schema_message],
                response_format={"type": "json_object"},
            )
        except OpenAIError as exc:
            raise ValueError(f"OpenAI JSON object request failed: {exc}") from exc

        content = response.choices[0].message.content
        if not content:
            raise ValueError("OpenAI response did not include JSON object content.")
        return response_model.model_validate_json(content).model_dump()
