from __future__ import annotations

from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

from backend.services.ai.feature_extractor import AIFeatures


class AdImprovementResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    problems: list[str] = Field(min_length=1)
    suggestions: list[str] = Field(min_length=1)
    headlines: list[str] = Field(min_length=1)
    bodies: list[str] = Field(min_length=1)
    ctas: list[str] = Field(min_length=1)


class LLMClient(Protocol):
    def generate_json(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
        response_model: type[BaseModel],
    ) -> dict[str, Any]:
        ...


class AdImprovementService:
    def __init__(self, llm_client: LLMClient) -> None:
        self.llm_client = llm_client

    def analyze(self, features: AIFeatures) -> AdImprovementResult:
        payload = self.llm_client.generate_json(
            system_prompt=(
                "Analyze X ad performance features. Return only JSON matching "
                "AdImprovementResult. Check CTR decline, CPC increase, LP mismatch, "
                "weak hook, and weak CTA."
            ),
            user_payload=features.model_dump(),
            response_model=AdImprovementResult,
        )
        return TypeAdapter(AdImprovementResult).validate_python(payload)
