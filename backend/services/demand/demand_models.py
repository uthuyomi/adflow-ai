from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

DemandSourceType = Literal[
    "x",
    "reddit",
    "yahoo_chiebukuro",
    "amazon_review",
    "rakuten_review",
    "kakaku_review",
    "youtube_comment",
    "google_search",
    "google_related_search",
    "google_suggest",
    "google_people_also_ask",
    "competitor_lp",
    "competitor_review",
    "comparison_article",
    "note",
    "qiita",
    "zenn",
    "bbs",
    "forum",
    "review_site",
    "app_store_review",
    "google_play_review",
]


class DemandRawSignal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_type: str
    source_name: str
    connector_key: str = "synthetic"
    external_id: str | None = None
    url: str | None = None
    title: str
    body: str
    posted_at: str | None = None
    collected_at: str | None = None
    engagement: dict[str, int] = Field(default_factory=dict)
    like_count: int = 0
    comment_count: int = 0
    share_count: int = 0
    language: str = "ja"
    metadata: dict[str, Any] = Field(default_factory=dict)


class DemandNormalizedSignal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    raw_signal_index: int
    normalized_text: str
    quality_score: int = Field(ge=0, le=100)
    noise_score: float = Field(default=0, ge=0, le=1)
    spam_score: float = Field(default=0, ge=0, le=1)
    duplicate_group_id: str | None = None
    is_spam: bool = False
    is_ad: bool = False
    is_bot: bool = False


class DemandCluster(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    cluster_type: str
    name: str
    category: str
    count: int
    source_count: int
    representative_quotes: list[str]
    growth_rate: float
    confidence: float
    persona_ratios: dict[str, float]
    root_causes: list[str]
    demand_signal_score: int
    trend: str
    evidence_signal_indexes: list[int]
    validation_score: float = 0
    fit_score: float | None = None
    trend_status: str = "unknown"
    source_diversity: int = 0
    noise_ratio: float = 0
    duplicate_ratio: float = 0
    evidence_quality_score: float = 0


class DemandSignalValidation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    validation_score: float = 0
    confidence: float = 0
    cross_source_confirmed: bool = False
    source_diversity: int = 0
    duplicate_ratio: float = 0
    noise_ratio: float = 0
    spam_ratio: float = 0
    recency_score: float = 0
    continuity_score: float = 0
    bias_warnings: list[str] = Field(default_factory=list)
    validation_reasons: list[str] = Field(default_factory=list)


class DemandSolutionFit(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fit_target_type: str
    fit_target_text: str
    cluster_id: str | None = None
    fit_score: float = 0
    coverage_score: float = 0
    gap_score: float = 0
    confidence: float = 0
    matched_pains: list[str] = Field(default_factory=list)
    unmatched_pains: list[str] = Field(default_factory=list)
    recommended_adjustments: list[str] = Field(default_factory=list)
    evidence_signal_ids: list[str] = Field(default_factory=list)


class DemandSignalSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cluster_id: str | None = None
    cluster_name: str
    cluster_type: str
    category: str | None = None
    snapshot_date: str | None = None
    signal_count: int = 0
    source_count: int = 0
    demand_signal_score: float = 0
    validation_score: float = 0
    fit_score: float | None = None
    growth_7d: float | None = None
    growth_30d: float | None = None
    growth_90d: float | None = None
    trend_status: str = "unknown"


class DemandSourceRunResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_type: str
    connector_key: str
    status: str
    requested_count: int = 0
    collected_count: int = 0
    stored_count: int = 0
    error_message: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class DemandConnectorLog(BaseModel):
    model_config = ConfigDict(extra="forbid")

    connector_key: str
    level: str = "info"
    message: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class DemandConnectorRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str
    expanded_queries: list[str] = Field(default_factory=list)
    max_results: int = 100
    language: str = "ja"
    region: str = "JP"
    project_id: str | None = None
    ad_lp_pair_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class DemandConnectorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_type: str
    connector_key: str
    status: str
    signals: list[DemandRawSignal] = Field(default_factory=list)
    error_message: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
