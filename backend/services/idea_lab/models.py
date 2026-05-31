from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class IdeaSessionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = None
    project_id: str | None = None
    initial_message: str | None = None


class IdeaChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str | None = None
    message: str


class IdeaReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    max_evidence_items: int = 100


class IdeaDiscoverRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = "What should I build?"
    max_items: int = 5


class IdeaCompareRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ideas: list[dict[str, Any]] = Field(min_length=2)


class IdeaMonitoringRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    query: str | None = None
    monitoring_type: str = "pain_trend"
    max_evidence_items: int = 100


class ConvertToProductRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    project_id: str | None = None
    product_name: str | None = None


class IdeaOpportunityScore(BaseModel):
    model_config = ConfigDict(extra="forbid")

    need_score: float
    pain_score: float
    competition_score: float
    monetization_score: float
    implementation_score: float
    confidence_score: float
    idea_opportunity_score: float
    decision: str
    decision_reason: str
