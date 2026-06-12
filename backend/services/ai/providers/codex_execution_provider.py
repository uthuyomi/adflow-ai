from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class CodexExecutionProvider:
    provider_key = "codex"

    def is_configured(self) -> bool:
        return False

    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
        schema: dict[str, Any],
        response_model: type[BaseModel] | None = None,
    ) -> dict[str, Any]:
        raise ValueError("Codex must run through the audited Codex Task execution pipeline; MockProvider is not allowed.")
