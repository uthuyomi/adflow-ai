from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EvidenceCollectionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str | None = None
    ad_lp_pair_id: str | None = None
    product_review_run_id: str | None = None
    market_research_run_id: str | None = None
    monitoring_run_id: str | None = None
    idea_session_id: str | None = None
    query: str
    sources: list[str] = Field(default_factory=lambda: ["manual", "mock"])
    max_items: int = 500
    language: str | None = "ja"
    region: str | None = "JP"
    manual_items: list[dict[str, Any]] = Field(default_factory=list)


class EvidenceSourceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str | None = None
    ad_lp_pair_id: str | None = None
    market_research_run_id: str | None = None
    product_review_run_id: str | None = None
    monitoring_run_id: str | None = None
    idea_session_id: str | None = None
    source_type: str
    source_platform: str | None = None
    source_url: str | None = None
    title: str | None = None
    author: str | None = None
    published_at: str | None = None
    query: str | None = None
    language: str | None = None
    region: str | None = None
    raw_content: str
    normalized_content: str | None = None
    content_hash: str | None = None
    sentiment: str | None = None
    relevance_score: float | None = None
    credibility_score: float | None = None
    spam_score: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class EvidenceSource(EvidenceSourceCreate):
    id: str
    user_id: str
    collected_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class EvidenceEmbedding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str | None = None
    user_id: str | None = None
    evidence_source_id: str
    provider: str = "fallback"
    model: str | None = None
    dimensions: int
    embedding: list[float]


class EvidenceCluster(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str | None = None
    user_id: str | None = None
    project_id: str | None = None
    ad_lp_pair_id: str | None = None
    market_research_run_id: str | None = None
    product_review_run_id: str | None = None
    monitoring_run_id: str | None = None
    idea_session_id: str | None = None
    cluster_type: str
    label: str
    description: str | None = None
    evidence_count: int = 0
    severity_score: float | None = None
    frequency_score: float | None = None
    urgency_score: float | None = None
    opportunity_score: float | None = None
    trend_score: float | None = None
    confidence: float | None = None
    representative_evidence_ids: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class EvidenceCollectionResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    evidence_count: int
    embedding_count: int
    cluster_count: int
    sources: list[dict[str, Any]] = Field(default_factory=list)
    clusters: list[dict[str, Any]] = Field(default_factory=list)


class EvidenceNormalizeResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sources: list[EvidenceSourceCreate]
    skipped_count: int = 0


class EvidenceClusterResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    clusters: list[EvidenceCluster]


class EvidenceSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str | None = None
    ad_lp_pair_id: str | None = None
    query: str
    limit: int = 20


class EvidenceSearchResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str
    results: list[dict[str, Any]]
