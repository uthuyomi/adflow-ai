from __future__ import annotations

from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

from backend.services.ai.diff_service import DiffResult


class ReviewResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    exaggerated_claims: list[str]
    brand_risks: list[str]
    ui_risks: list[str]
    dangerous_changes: list[str]
    approved_for_pr: bool


class LLMClient(Protocol):
    def generate_json(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
        response_model: type[BaseModel],
    ) -> dict[str, Any]:
        ...


class ReviewService:
    def __init__(self, llm_client: LLMClient) -> None:
        self.llm_client = llm_client

    def review(self, diff: DiffResult) -> ReviewResult:
        self._reject_dangerous_paths(diff)
        payload = self.llm_client.generate_json(
            system_prompt=(
                "Review a proposed diff plan. Return JSON matching ReviewResult. "
                "Check exaggerated claims, brand damage, UI risk, and dangerous "
                "changes. This review only decides whether a PR may be created."
            ),
            user_payload=diff.model_dump(),
            response_model=ReviewResult,
        )
        return TypeAdapter(ReviewResult).validate_python(payload)

    @staticmethod
    def _reject_dangerous_paths(diff: DiffResult) -> None:
        blocked_fragments = {
            ".env",
            "secrets",
            "credentials",
            "node_modules",
            ".git",
        }
        dangerous = [
            file.path
            for file in diff.files
            if any(fragment in file.path for fragment in blocked_fragments)
        ]
        if dangerous:
            raise ValueError(f"Diff contains dangerous paths: {dangerous}")
