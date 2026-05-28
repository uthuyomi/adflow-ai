from __future__ import annotations

from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

from backend.services.ai.ad_improvement_service import AdImprovementResult
from backend.services.ai.lp_improvement_service import LPImprovementResult


class TextChange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    before: str
    after: str


class FileDiff(BaseModel):
    model_config = ConfigDict(extra="forbid")

    path: str
    changes: list[TextChange] = Field(min_length=1)


class DiffResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    files: list[FileDiff] = Field(min_length=1)


class LLMClient(Protocol):
    def generate_json(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
        response_model: type[BaseModel],
    ) -> dict[str, Any]:
        ...


class DiffService:
    def __init__(self, llm_client: LLMClient) -> None:
        self.llm_client = llm_client

    def generate(
        self,
        *,
        ad_improvements: AdImprovementResult,
        lp_improvements: LPImprovementResult,
        allowed_paths: list[str],
    ) -> DiffResult:
        payload = self.llm_client.generate_json(
            system_prompt=(
                "Generate a text replacement diff plan only. Return JSON matching "
                "DiffResult. Use only paths from allowed_paths. Do not apply changes."
            ),
            user_payload={
                "ad_improvements": ad_improvements.model_dump(),
                "lp_improvements": lp_improvements.model_dump(),
                "allowed_paths": allowed_paths,
            },
            response_model=DiffResult,
        )
        diff = TypeAdapter(DiffResult).validate_python(payload)
        self._validate_allowed_paths(diff, allowed_paths)
        return diff

    @staticmethod
    def _validate_allowed_paths(diff: DiffResult, allowed_paths: list[str]) -> None:
        allowed = set(allowed_paths)
        invalid = [file.path for file in diff.files if file.path not in allowed]
        if invalid:
            raise ValueError(f"Diff contains disallowed paths: {invalid}")
