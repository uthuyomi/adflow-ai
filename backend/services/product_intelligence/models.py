from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RoadmapGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_review_run_id: str | None = None
    title: str | None = None


class MonitoringRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str
    ad_lp_pair_id: str | None = None
    query: str
    monitoring_type: str = "market"
    max_evidence_items: int = 100


class IntelligenceAlertUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str | None = None
    severity: str | None = None
    metadata: dict[str, Any] | None = None


class LearningPatternRefreshResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str
    pattern_count: int
    patterns: list[dict[str, Any]] = Field(default_factory=list)
