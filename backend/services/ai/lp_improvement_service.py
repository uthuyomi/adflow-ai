from __future__ import annotations

from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

from backend.services.ai.feature_extractor import AIFeatures
from backend.services.lp.lp_collector import LPCollection


class LPImprovementResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hero: list[str] = Field(min_length=1)
    cta: list[str] = Field(min_length=1)
    faq: list[str] = Field(min_length=1)
    structure: list[str] = Field(min_length=1)
    mobile_ui: list[str] = Field(min_length=1)


class LLMClient(Protocol):
    def generate_json(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
        response_model: type[BaseModel],
    ) -> dict[str, Any]:
        ...


class LPImprovementService:
    def __init__(self, llm_client: LLMClient) -> None:
        self.llm_client = llm_client

    def analyze(
        self,
        lp_data: LPCollection,
        features: AIFeatures,
    ) -> LPImprovementResult:
        payload = self.llm_client.generate_json(
            system_prompt=(
                "Analyze landing page issues. Return only JSON matching "
                "LPImprovementResult. Check hero, CTA, FAQ, LP structure, and "
                "mobile UI. Do not propose direct file changes."
            ),
            user_payload={
                "lp": lp_data.model_dump(),
                "features": features.model_dump(),
            },
            response_model=LPImprovementResult,
        )
        return TypeAdapter(LPImprovementResult).validate_python(payload)
