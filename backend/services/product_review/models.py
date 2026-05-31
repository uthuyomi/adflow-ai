from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


ReviewMode = Literal["quick", "standard", "deep"]


class ProductProfilePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str
    product_name: str
    product_url: str | None = None
    short_description: str | None = None
    target_users: str | None = None
    core_value: str | None = None
    current_features: list[str] = Field(default_factory=list)
    pricing_model: str | None = None
    current_stage: str | None = None
    positioning_notes: str | None = None
    known_constraints: str | None = None
    do_not_build: list[str] = Field(default_factory=list)


class ProductProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_name: str | None = None
    product_url: str | None = None
    short_description: str | None = None
    target_users: str | None = None
    core_value: str | None = None
    current_features: list[str] | None = None
    pricing_model: str | None = None
    current_stage: str | None = None
    positioning_notes: str | None = None
    known_constraints: str | None = None
    do_not_build: list[str] | None = None


class ProductReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str
    ad_lp_pair_id: str | None = None
    query: str
    review_mode: ReviewMode = "standard"
    evidence_collection_mode: str = "manual_or_mock"
    max_evidence_items: int = 500
    manual_evidence_items: list[dict[str, Any]] = Field(default_factory=list)


class ProductOpportunityScore(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_opportunity_score: float
    need_score: float
    pain_score: float
    gap_score: float
    product_fit_score: float
    message_fit_score: float
    acquisition_fit_score: float
    evidence_confidence: float
    implementation_cost_risk: float


class BacklogCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    description: str
    category: str = "ux_improvement"
    impact_score: float = 60
    cost_score: float = 50
    confidence_score: float = 50
    evidence_count: int = 0
    target_area: str | None = None
    affected_files_hint: list[str] = Field(default_factory=list)
    acceptance_criteria: list[str] = Field(default_factory=list)
    evidence_cluster_ids: list[str] = Field(default_factory=list)
    evidence_source_ids: list[str] = Field(default_factory=list)
    rationale: str | None = None
    risk_notes: str | None = None
    do_not_do: str | None = None


class ProductReviewOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    executive_summary: str
    strongest_pain_points: list[str] = Field(default_factory=list)
    competitor_gaps: list[str] = Field(default_factory=list)
    product_fit_analysis: str = ""
    ux_feature_issues: list[str] = Field(default_factory=list)
    feature_add_candidates: list[str] = Field(default_factory=list)
    feature_remove_candidates: list[str] = Field(default_factory=list)
    onboarding_improvements: list[str] = Field(default_factory=list)
    pricing_packaging_suggestions: list[str] = Field(default_factory=list)
    recommended_positioning: list[str] = Field(default_factory=list)
    roadmap_candidates: list[str] = Field(default_factory=list)
    do_not_build: list[str] = Field(default_factory=list)
    backlog_items: list[BacklogCandidate] = Field(default_factory=list)


class ProductBacklogDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    reason: str | None = None
