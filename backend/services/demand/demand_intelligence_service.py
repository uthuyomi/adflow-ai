from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from math import sqrt
from typing import Any, Literal
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import BaseModel, ConfigDict, Field

from backend.core.config import Settings, load_settings
from backend.services.demand.connectors.connector_registry import DemandConnectorRegistry
from backend.services.demand.demand_models import DemandConnectorRequest
from backend.services.demand.demand_monitoring_engine import DemandMonitoringEngine
from backend.services.demand.market_size_layer import MarketSizeLayer
from backend.services.demand.outcome_feedback_learning import OutcomeFeedbackLearning
from backend.services.demand.search_demand_layer import SearchDemandLayer
from backend.services.demand.signal_validation_engine import SignalValidationEngine
from backend.services.demand.solution_fit_engine import SolutionFitEngine
from backend.services.demand.source_query_builder import SourceQueryBuilder
from backend.services.supabase.supabase_repository import SupabaseRepository

SourceType = Literal[
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
    "synthetic",
]

PAIN_CATEGORIES = [
    "作業負荷",
    "コスト",
    "時間",
    "UI",
    "機能不足",
    "複雑さ",
    "学習コスト",
    "サポート不足",
    "速度",
    "安定性",
    "信頼性",
    "データ管理",
    "レポート作成",
    "分析",
    "運用",
    "自動化不足",
    "その他",
]

DESIRE_CATEGORIES = [
    "自動化したい",
    "簡単にしたい",
    "早くしたい",
    "安くしたい",
    "統合したい",
    "見える化したい",
    "共有したい",
    "管理したい",
    "改善したい",
    "学習したい",
]

PERSONAS = ["個人開発者", "フリーランス", "広告代理店", "中小企業", "大企業", "マーケ担当", "経営者", "エンジニア", "デザイナー", "学生", "その他"]


# Release-facing labels override legacy mojibake values while preserving the existing pipeline.
PAIN_CATEGORIES = ["作業負荷", "コスト", "時間", "UI", "機能不足", "複雑さ", "学習コスト", "サポート不足", "速度", "安定性", "信頼性", "データ管理", "レポート作成", "分析", "運用", "自動化不足", "その他"]
DESIRE_CATEGORIES = ["自動化したい", "簡単にしたい", "速くしたい", "安くしたい", "統合したい", "見える化したい", "共有したい", "管理したい", "改善したい", "学習したい"]
PERSONAS = ["個人開発者", "フリーランス", "広告代理店", "中小企業", "大企業", "マーケ担当", "経営者", "エンジニア", "デザイナー", "学生", "その他"]


class DemandRawSignal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_type: SourceType
    source_name: str
    url: str | None = None
    title: str
    body: str
    posted_at: str | None = None
    engagement: dict[str, int] = Field(default_factory=dict)
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


class DemandExtractedItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    category: str
    intensity: int = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    target_user: str
    evidence_signal_indexes: list[int]


class DemandCluster(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    cluster_type: Literal["pain", "desire"]
    name: str
    category: str
    count: int
    source_count: int
    representative_quotes: list[str]
    growth_rate: float
    confidence: float
    persona_ratios: dict[str, float]
    root_causes: list[str]
    demand_signal_score: int = Field(ge=0, le=100)
    trend: Literal["増加", "減少", "急増", "横ばい", "growing", "declining", "spike", "stable"]
    evidence_signal_indexes: list[int]
    validation_score: float = 0
    fit_score: float | None = None
    trend_status: str = "unknown"
    source_diversity: int = 0
    noise_ratio: float = 0
    duplicate_ratio: float = 0
    evidence_quality_score: float = 0


class DemandCompetitor(BaseModel):
    model_config = ConfigDict(extra="forbid")

    service_name: str
    price: str
    main_features: list[str]
    strengths: list[str]
    weaknesses: list[str]
    reviews: list[str]
    complaints: list[str]
    rating: float
    market_position: str


class DemandOpportunity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    description: str
    evidence: list[str]
    related_clusters: list[str]
    related_competitors: list[str]
    expected_value: str
    risks: list[str]


class DemandFeatureSuggestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feature_name: str
    solves: list[str]
    reason: str
    priority: Literal["high", "medium", "low"]
    mvp: str
    expansion: str


class DemandPositioning(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recommended_position: str
    differentiation_points: list[str]
    competitor_comparison: list[str]
    key_messages: list[str]


class DemandAdAppeal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    appeal_axis: str
    hooks: list[str]
    headlines: list[str]
    bodies: list[str]
    ctas: list[str]


class DemandLPContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hero_improvements: list[str]
    cta_improvements: list[str]
    faq_ideas: list[str]
    section_ideas: list[str]
    structure_improvements: list[str]


class DemandIntelligenceSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    overview: str
    top_pain_clusters: list[dict[str, Any]]
    top_desire_clusters: list[dict[str, Any]]
    top_demand_signals: list[dict[str, Any]]
    emerging_trends: list[dict[str, Any]]
    competitor_gaps: list[dict[str, Any]]
    opportunities: list[DemandOpportunity]
    recommended_features: list[DemandFeatureSuggestion]
    recommended_positioning: DemandPositioning
    ad_appeals: list[DemandAdAppeal]
    lp_improvement_context: DemandLPContext
    evidence_summary: list[dict[str, Any]]
    guardrails: list[str]
    source_status_summary: dict[str, Any] = Field(default_factory=dict)
    validation_summary: dict[str, Any] = Field(default_factory=dict)
    solution_fit_summary: dict[str, Any] = Field(default_factory=dict)
    monitoring_summary: dict[str, Any] = Field(default_factory=dict)
    search_demand_summary: dict[str, Any] = Field(default_factory=dict)
    market_size_summary: dict[str, Any] = Field(default_factory=dict)
    outcome_learning_summary: dict[str, Any] = Field(default_factory=dict)
    pair_analysis_context: dict[str, Any]


class DemandIntelligenceService:
    def __init__(self, *, repository: SupabaseRepository, settings: Settings | None = None) -> None:
        self.repository = repository
        self.settings = settings or load_settings()
        self.query_builder = SourceQueryBuilder()
        self.connector_registry = DemandConnectorRegistry(self.settings)
        self.validation_engine = SignalValidationEngine()
        self.solution_fit_engine = SolutionFitEngine()
        self.monitoring_engine = DemandMonitoringEngine()
        self.search_demand_layer = SearchDemandLayer()
        self.market_size_layer = MarketSizeLayer()
        self.outcome_learning = OutcomeFeedbackLearning()

    def run(
        self,
        *,
        user_id: str,
        project_id: str | None = None,
        ad_lp_pair_id: str | None = None,
        query: str,
        locale: str = "ja",
        mode: Literal["pair_analysis", "discovery"] = "pair_analysis",
        discovery_session_id: str | None = None,
        scope_type: str | None = None,
        target_segment: str | None = None,
        problem_statement: str | None = None,
        product_idea: str | None = None,
        research_query: str | None = None,
        research_fingerprint: str | None = None,
        source_urls: list[str] | None = None,
    ) -> dict[str, Any]:
        if not query.strip():
            raise ValueError("query is required.")
        if mode == "pair_analysis":
            if not ad_lp_pair_id:
                raise ValueError("ad_lp_pair_id is required for pair_analysis.")
            pair = self.repository.get_one("ad_lp_pairs", user_id=user_id, filters={"id": ad_lp_pair_id})
            if project_id is None:
                project_id = pair.get("project_id")
            ad = self._safe_get_one("twitter_ads", user_id=user_id, record_id=pair.get("twitter_ad_id"))
            lp = self._safe_get_one("landing_pages", user_id=user_id, record_id=pair.get("landing_page_id"))
        else:
            if not discovery_session_id:
                raise ValueError("discovery_session_id is required for discovery mode.")
            pair = {"name": product_idea or query, "project_id": project_id}
            ad = {
                "headline": product_idea or query,
                "body": problem_statement or "",
            }
            lp = {
                "hero_title": product_idea or query,
                "offer_text": problem_statement or "",
                "target_audience": target_segment or "",
            }

        run = self.repository.insert(
            "demand_intelligence_runs",
            {
                "user_id": user_id,
                "project_id": project_id,
                "ad_lp_pair_id": ad_lp_pair_id,
                "query": query.strip(),
                "status": "running",
                "summary": {},
                "real_sources_enabled": self.settings.demand_real_sources_enabled,
                "mode": mode,
                "discovery_session_id": discovery_session_id,
                "scope_type": scope_type,
                "target_segment": target_segment,
                "problem_statement": problem_statement,
                "product_idea": product_idea,
                "research_query": research_query or query.strip(),
                "research_fingerprint": research_fingerprint,
            },
        )
        try:
            raw_signals, source_status_summary = self._collect_signals(
                user_id=user_id,
                run_id=run["id"],
                query=query,
                pair=pair,
                ad=ad,
                lp=lp,
                source_urls=source_urls,
                product_idea=product_idea,
                locale=locale,
            )
            if not raw_signals:
                raise ValueError("No demand signals were collected.")
            normalized = self._normalize_signals(raw_signals)
            pains = self._extract_pains(normalized, locale=locale)
            desires = self._extract_desires(normalized, locale=locale)
            churn_reasons = self._extract_churn_reasons(normalized, locale=locale)
            embeddings = [self._embed(signal.normalized_text) for signal in normalized]
            clusters = self._cluster(normalized=normalized, pains=pains, desires=desires, locale=locale)
            competitors = self._analyze_competitors(query=query, normalized=normalized, churn_reasons=churn_reasons, locale=locale)
            gaps = self._market_gaps(clusters=clusters, competitors=competitors, locale=locale)
            opportunities = self._opportunities(gaps=gaps, locale=locale)
            features = self._feature_suggestions(opportunities=opportunities, locale=locale)
            positioning = self._positioning(query=query, gaps=gaps, competitors=competitors, locale=locale)
            ad_appeals = self._ad_appeals(query=query, clusters=clusters, positioning=positioning, locale=locale)
            lp_context = self._lp_context(clusters=clusters, opportunities=opportunities, locale=locale)

            inserted_signals: list[dict[str, Any]] = []
            for index, signal in enumerate(raw_signals):
                inserted = self.repository.insert(
                    "demand_intelligence_signals",
                    {
                        "run_id": run["id"],
                        "source_type": signal.source_type,
                        "source_name": signal.source_name,
                        "external_id": getattr(signal, "external_id", None),
                        "connector_key": getattr(signal, "connector_key", "synthetic"),
                        "url": signal.url,
                        "title": signal.title,
                        "body": signal.body,
                        "posted_at": signal.posted_at,
                        "engagement": signal.engagement,
                        "language": signal.language,
                        "quality_score": normalized[index].quality_score,
                        "noise_score": getattr(normalized[index], "noise_score", 0),
                        "spam_score": getattr(normalized[index], "spam_score", 0),
                        "duplicate_group_id": getattr(normalized[index], "duplicate_group_id", None),
                        "metadata": {
                            **signal.metadata,
                            "normalized_text": normalized[index].normalized_text,
                            "quality_score": normalized[index].quality_score,
                            "noise_score": getattr(normalized[index], "noise_score", 0),
                            "spam_score": getattr(normalized[index], "spam_score", 0),
                            "is_spam": normalized[index].is_spam,
                            "is_ad": normalized[index].is_ad,
                            "is_bot": normalized[index].is_bot,
                        },
                    },
                )
                inserted_signals.append(inserted)
            for index, vector in enumerate(embeddings):
                self.repository.insert(
                    "demand_intelligence_embeddings",
                    {
                        "run_id": run["id"],
                        "signal_index": index,
                        "embedding": vector,
                        "model_name": self.settings.demand_embedding_model,
                    },
                )
            inserted_clusters: list[dict[str, Any]] = []
            for cluster in clusters:
                cluster_payload = cluster.model_dump(mode="json")
                cluster_payload.pop("id", None)
                inserted_cluster = self.repository.insert(
                    "demand_intelligence_clusters",
                    {"run_id": run["id"], **cluster_payload},
                )
                cluster_dict = cluster.model_dump(mode="json")
                cluster_dict["db_id"] = inserted_cluster.get("id")
                cluster_dict["evidence_signal_ids"] = [
                    inserted_signals[index]["id"]
                    for index in cluster.evidence_signal_indexes
                    if 0 <= index < len(inserted_signals)
                ]
                inserted_clusters.append(cluster_dict)

            validations, validation_summary = self.validation_engine.validate(
                signals=inserted_signals,
                clusters=inserted_clusters,
                locale=locale,
            )
            validation_rows = []
            for validation in validations:
                row = self.repository.insert(
                    "demand_signal_validations",
                    {
                        "user_id": user_id,
                        "run_id": run["id"],
                        "cluster_id": validation.get("cluster_id"),
                        "signal_id": None,
                        "validation_target": "cluster",
                        "validation_score": validation["validation_score"],
                        "confidence": validation["confidence"],
                        "cross_source_confirmed": validation["cross_source_confirmed"],
                        "source_diversity": validation["source_diversity"],
                        "duplicate_ratio": validation["duplicate_ratio"],
                        "noise_ratio": validation["noise_ratio"],
                        "spam_ratio": validation["spam_ratio"],
                        "recency_score": validation["recency_score"],
                        "continuity_score": validation["continuity_score"],
                        "bias_warnings": validation["bias_warnings"],
                        "validation_reasons": validation["validation_reasons"],
                    },
                )
                validation_rows.append(row)
                if validation.get("cluster_id"):
                    self.repository.update_demand_cluster_validation(
                        run_id=run["id"],
                        cluster_id=validation["cluster_id"],
                        payload={
                            "validation_score": validation["validation_score"],
                            "source_diversity": validation["source_diversity"],
                            "noise_ratio": validation["noise_ratio"],
                            "duplicate_ratio": validation["duplicate_ratio"],
                            "evidence_quality_score": max(0, 100 - validation["noise_ratio"] * 50 - validation["duplicate_ratio"] * 50),
                        },
                    )
                    for cluster in inserted_clusters:
                        if cluster.get("db_id") == validation.get("cluster_id"):
                            cluster.update(
                                {
                                    "validation_score": validation["validation_score"],
                                    "source_diversity": validation["source_diversity"],
                                    "noise_ratio": validation["noise_ratio"],
                                    "duplicate_ratio": validation["duplicate_ratio"],
                                    "evidence_quality_score": max(0, 100 - validation["noise_ratio"] * 50 - validation["duplicate_ratio"] * 50),
                                },
                            )

            preliminary_summary = self._summary(
                query=query,
                raw_signals=raw_signals,
                normalized=normalized,
                pains=pains,
                desires=desires,
                clusters=[DemandCluster.model_validate({k: v for k, v in cluster.items() if k in DemandCluster.model_fields}) for cluster in inserted_clusters],
                competitors=competitors,
                gaps=gaps,
                opportunities=opportunities,
                features=features,
                positioning=positioning,
                ad_appeals=ad_appeals,
                lp_context=lp_context,
            ).model_dump(mode="json")
            targets = self.solution_fit_engine.build_targets(ad=ad, lp=lp, summary=preliminary_summary)
            solution_fits, solution_fit_summary = self.solution_fit_engine.evaluate(
                clusters=inserted_clusters,
                targets=targets,
                locale=locale,
            )
            fit_rows = self.repository.insert_demand_solution_fits(
                [
                    {
                        "user_id": user_id,
                        "run_id": run["id"],
                        "project_id": project_id,
                        "ad_lp_pair_id": ad_lp_pair_id,
                        "cluster_id": fit.get("cluster_id") if _looks_uuid(fit.get("cluster_id")) else None,
                        "fit_target_type": fit["fit_target_type"],
                        "fit_target_text": fit["fit_target_text"],
                        "fit_score": fit["fit_score"],
                        "coverage_score": fit["coverage_score"],
                        "gap_score": fit["gap_score"],
                        "confidence": fit["confidence"],
                        "matched_pains": fit["matched_pains"],
                        "unmatched_pains": fit["unmatched_pains"],
                        "recommended_adjustments": fit["recommended_adjustments"],
                        "evidence_signal_ids": fit["evidence_signal_ids"],
                    }
                    for fit in solution_fits
                ],
            )
            previous_snapshots = (
                self.repository.get_demand_snapshots_for_cluster(user_id=user_id, pair_id=ad_lp_pair_id, limit=100)
                if ad_lp_pair_id
                else []
            )
            snapshots, monitoring_summary = self.monitoring_engine.snapshot(
                clusters=inserted_clusters,
                validations=validations,
                solution_fits=solution_fits,
                previous_snapshots=previous_snapshots,
            )
            snapshot_rows = self.repository.insert_demand_signal_snapshots(
                [
                    {
                        "user_id": user_id,
                        "project_id": project_id,
                        "ad_lp_pair_id": ad_lp_pair_id,
                        "run_id": run["id"],
                        "cluster_id": snapshot.get("cluster_id") if _looks_uuid(snapshot.get("cluster_id")) else None,
                        **{key: value for key, value in snapshot.items() if key != "cluster_id"},
                    }
                    for snapshot in snapshots
                ],
            )
            trend_by_cluster = {snapshot.get("cluster_id"): snapshot.get("trend_status") for snapshot in snapshots}
            for cluster in inserted_clusters:
                if cluster.get("db_id"):
                    trend_status = trend_by_cluster.get(cluster["db_id"], "unknown")
                    self.repository.update_demand_cluster_validation(
                        run_id=run["id"],
                        cluster_id=cluster["db_id"],
                        payload={"trend_status": trend_status},
                    )
                    cluster["trend_status"] = trend_status

            expanded_queries = self.query_builder.build(query=query, pair=pair, ad=ad, lp=lp, source_urls=source_urls, locale=locale)
            search_signals, search_demand_summary = self.search_demand_layer.build(
                query=query,
                expanded_queries=expanded_queries,
                clusters=inserted_clusters,
                opportunities=opportunities,
                features=features,
                locale=locale,
            )
            search_rows = self.repository.insert_demand_search_signals(
                [
                    {
                        "user_id": user_id,
                        "run_id": run["id"],
                        "project_id": project_id,
                        "ad_lp_pair_id": ad_lp_pair_id,
                        "query": signal["query"],
                        "keyword": signal["keyword"],
                        "source_type": signal["source_type"],
                        "search_volume_estimate": signal["search_volume_estimate"],
                        "competition_level": signal["competition_level"],
                        "cpc_estimate": signal["cpc_estimate"],
                        "related_keywords": signal["related_keywords"],
                        "suggest_queries": signal["suggest_queries"],
                        "people_also_ask": signal["people_also_ask"],
                        "trend_status": signal["trend_status"],
                        "confidence": signal["confidence"],
                        "metadata": {**signal.get("metadata", {}), "search_demand_score": signal["search_demand_score"]},
                    }
                    for signal in search_signals
                ],
            )
            market_estimates, market_size_summary = self.market_size_layer.estimate(
                clusters=inserted_clusters,
                search_signals=search_signals,
                solution_fits=solution_fits,
                competitor_gaps=gaps,
                locale=locale,
            )
            market_rows = self.repository.insert_demand_market_size_estimates(
                [
                    {
                        "user_id": user_id,
                        "run_id": run["id"],
                        "project_id": project_id,
                        "ad_lp_pair_id": ad_lp_pair_id,
                        "cluster_id": estimate.get("cluster_id") if _looks_uuid(estimate.get("cluster_id")) else None,
                        "segment_name": estimate["segment_name"],
                        "persona": estimate.get("persona"),
                        "estimated_audience_size_min": estimate["estimated_audience_size_min"],
                        "estimated_audience_size_max": estimate["estimated_audience_size_max"],
                        "search_demand_score": estimate["search_demand_score"],
                        "pain_signal_score": estimate["pain_signal_score"],
                        "competitor_gap_score": estimate["competitor_gap_score"],
                        "market_size_score": estimate["market_size_score"],
                        "confidence": estimate["confidence"],
                        "assumptions": estimate["assumptions"],
                        "evidence": estimate["evidence"],
                    }
                    for estimate in market_estimates
                ],
            )
            recent_outcomes = (
                self.repository.get_improvement_outcomes_for_analysis_context(
                    user_id=user_id,
                    pair_id=ad_lp_pair_id,
                    limit=30,
                )
                if ad_lp_pair_id
                else []
            )
            learning_links, outcome_learning_summary = self.outcome_learning.build(
                clusters=inserted_clusters,
                outcomes=recent_outcomes,
                search_signals=search_signals,
                market_estimates=market_estimates,
                locale=locale,
            )
            learning_rows = self.repository.insert_demand_outcome_learning_links(
                [
                    {
                        "user_id": user_id,
                        "run_id": run["id"],
                        "cluster_id": link.get("cluster_id") if _looks_uuid(link.get("cluster_id")) else None,
                        "ad_lp_pair_id": link.get("ad_lp_pair_id") or ad_lp_pair_id,
                        "analysis_run_id": link.get("analysis_run_id"),
                        "outcome_id": link.get("outcome_id"),
                        "demand_signal_score": link.get("demand_signal_score"),
                        "validation_score": link.get("validation_score"),
                        "fit_score": link.get("fit_score"),
                        "search_demand_score": link.get("search_demand_score"),
                        "market_size_score": link.get("market_size_score"),
                        "before_metrics": link.get("before_metrics", {}),
                        "after_metrics": link.get("after_metrics", {}),
                        "metric_delta": link.get("metric_delta", {}),
                        "learning_status": link.get("learning_status", "unknown"),
                        "learning_summary": link.get("learning_summary"),
                    }
                    for link in learning_links
                ],
            )
            search_demand_summary["rows"] = search_rows[:8]
            market_size_summary["rows"] = market_rows[:8]
            outcome_learning_summary["rows"] = learning_rows[:8]

            summary = self._summary(
                query=query,
                raw_signals=raw_signals,
                normalized=normalized,
                pains=pains,
                desires=desires,
                clusters=[DemandCluster.model_validate({k: v for k, v in cluster.items() if k in DemandCluster.model_fields}) for cluster in inserted_clusters],
                competitors=competitors,
                gaps=gaps,
                opportunities=opportunities,
                features=features,
                positioning=positioning,
                ad_appeals=ad_appeals,
                lp_context=lp_context,
                source_status_summary=source_status_summary,
                validation_summary=validation_summary,
                solution_fit_summary=solution_fit_summary,
                monitoring_summary=monitoring_summary,
                search_demand_summary=search_demand_summary,
                market_size_summary=market_size_summary,
                outcome_learning_summary=outcome_learning_summary,
                locale=locale,
            )

            run = self.repository.update(
                "demand_intelligence_runs",
                user_id=user_id,
                filters={"id": run["id"]},
                payload={
                    "status": "completed",
                    "summary": summary.model_dump(mode="json"),
                    "source_status_summary": source_status_summary,
                    "validation_summary": validation_summary,
                    "solution_fit_summary": solution_fit_summary,
                    "monitoring_summary": monitoring_summary,
                    "search_demand_summary": search_demand_summary,
                    "market_size_summary": market_size_summary,
                    "outcome_learning_summary": outcome_learning_summary,
                },
            )
            return self._hydrate(run)
        except Exception:
            self.repository.update(
                "demand_intelligence_runs",
                user_id=user_id,
                filters={"id": run["id"]},
                payload={"status": "failed"},
            )
            raise

    def latest_for_pair(self, *, user_id: str, pair_id: str) -> dict[str, Any]:
        runs = self.list_for_pair(user_id=user_id, pair_id=pair_id, limit=1)
        if not runs:
            raise ValueError("No demand intelligence run was found for this pair.")
        return runs[0]

    def list_for_pair(self, *, user_id: str, pair_id: str, limit: int = 20) -> list[dict[str, Any]]:
        runs = self.repository.get_many(
            "demand_intelligence_runs",
            user_id=user_id,
            filters={"ad_lp_pair_id": pair_id},
            order="created_at.desc",
            limit=limit,
        )
        return [self._hydrate(run) for run in runs]

    def latest_context_for_pair(self, *, user_id: str, pair_id: str) -> dict[str, Any] | None:
        try:
            return self.latest_for_pair(user_id=user_id, pair_id=pair_id)
        except ValueError:
            return None

    def get_run(self, *, user_id: str, run_id: str) -> dict[str, Any]:
        return self._hydrate(self.repository.get_one("demand_intelligence_runs", user_id=user_id, filters={"id": run_id}))

    def create_solution_fit(self, *, user_id: str, run_id: str, fit_target_type: str, fit_target_text: str) -> dict[str, Any]:
        run = self.get_run(user_id=user_id, run_id=run_id)
        clusters = run.get("clusters") or []
        fits, summary = self.solution_fit_engine.evaluate(clusters=clusters, targets=[(fit_target_type, fit_target_text)])
        rows = self.repository.insert_demand_solution_fits(
            [
                {
                    "user_id": user_id,
                    "run_id": run_id,
                    "project_id": run.get("project_id"),
                    "ad_lp_pair_id": run.get("ad_lp_pair_id"),
                    "cluster_id": fit.get("cluster_id") if _looks_uuid(fit.get("cluster_id")) else None,
                    "fit_target_type": fit["fit_target_type"],
                    "fit_target_text": fit["fit_target_text"],
                    "fit_score": fit["fit_score"],
                    "coverage_score": fit["coverage_score"],
                    "gap_score": fit["gap_score"],
                    "confidence": fit["confidence"],
                    "matched_pains": fit["matched_pains"],
                    "unmatched_pains": fit["unmatched_pains"],
                    "recommended_adjustments": fit["recommended_adjustments"],
                    "evidence_signal_ids": fit["evidence_signal_ids"],
                }
                for fit in fits
            ],
        )
        self.repository.update(
            "demand_intelligence_runs",
            user_id=user_id,
            filters={"id": run_id},
            payload={"solution_fit_summary": summary},
        )
        return {"fits": rows, "summary": summary}

    def rebuild_outcome_learning(self, *, user_id: str, run_id: str) -> dict[str, Any]:
        run = self.get_run(user_id=user_id, run_id=run_id)
        clusters = run.get("clusters") or []
        search_signals = self.repository.get_demand_search_signals_for_run(user_id=user_id, run_id=run_id)
        normalized_search = [
            {
                **signal,
                "search_demand_score": (signal.get("metadata") or {}).get("search_demand_score", 0),
            }
            for signal in search_signals
        ]
        market_estimates = self.repository.get_demand_market_size_for_run(user_id=user_id, run_id=run_id)
        outcomes = self.repository.get_improvement_outcomes_for_analysis_context(
            user_id=user_id,
            pair_id=run["ad_lp_pair_id"],
            limit=30,
        )
        links, summary = self.outcome_learning.build(
            clusters=clusters,
            outcomes=outcomes,
            search_signals=normalized_search,
            market_estimates=market_estimates,
        )
        rows = self.repository.insert_demand_outcome_learning_links(
            [
                {
                    "user_id": user_id,
                    "run_id": run_id,
                    "cluster_id": link.get("cluster_id") if _looks_uuid(link.get("cluster_id")) else None,
                    "ad_lp_pair_id": link.get("ad_lp_pair_id") or run.get("ad_lp_pair_id"),
                    "analysis_run_id": link.get("analysis_run_id"),
                    "outcome_id": link.get("outcome_id"),
                    "demand_signal_score": link.get("demand_signal_score"),
                    "validation_score": link.get("validation_score"),
                    "fit_score": link.get("fit_score"),
                    "search_demand_score": link.get("search_demand_score"),
                    "market_size_score": link.get("market_size_score"),
                    "before_metrics": link.get("before_metrics", {}),
                    "after_metrics": link.get("after_metrics", {}),
                    "metric_delta": link.get("metric_delta", {}),
                    "learning_status": link.get("learning_status", "unknown"),
                    "learning_summary": link.get("learning_summary"),
                }
                for link in links
            ],
        )
        self.repository.update(
            "demand_intelligence_runs",
            user_id=user_id,
            filters={"id": run_id},
            payload={"outcome_learning_summary": summary},
        )
        return {"links": rows, "summary": summary}

    def _hydrate(self, run: dict[str, Any]) -> dict[str, Any]:
        signals = self.repository.get_related_many(
            "demand_intelligence_signals",
            filters={"run_id": run["id"]},
            order="created_at.asc",
        )
        clusters = self.repository.get_related_many(
            "demand_intelligence_clusters",
            filters={"run_id": run["id"]},
            order="demand_signal_score.desc",
        )
        return {**run, "signals": signals, "clusters": clusters}

    def _safe_get_one(self, table: str, *, user_id: str, record_id: Any) -> dict[str, Any] | None:
        if not record_id:
            return None
        try:
            return self.repository.get_one(table, user_id=user_id, filters={"id": record_id})
        except ValueError:
            return None

    def _collect_signals(
        self,
        *,
        user_id: str,
        run_id: str,
        query: str,
        pair: dict[str, Any],
        ad: dict[str, Any] | None,
        lp: dict[str, Any] | None,
        source_urls: list[str] | None = None,
        product_idea: str | None = None,
        locale: str = "ja",
    ) -> tuple[list[DemandRawSignal], dict[str, Any]]:
        expanded = self.query_builder.build(query=query, pair=pair, ad=ad, lp=lp, source_urls=source_urls, locale=locale)
        all_signals: list[DemandRawSignal] = []
        source_results: list[dict[str, Any]] = []
        now = datetime.now(timezone.utc).isoformat()

        def record_skipped(connector: Any, reason: str) -> None:
            source_results.append(
                self.repository.create_demand_source_run(
                    {
                        "user_id": user_id,
                        "run_id": run_id,
                        "source_type": connector.source_type,
                        "query": query,
                        "status": "skipped",
                        "requested_count": 0,
                        "collected_count": 0,
                        "stored_count": 0,
                        "completed_at": now,
                        "metadata": {"connector_key": connector.connector_key, "reason": reason},
                    },
                ),
            )

        def execute_connector(connector: Any, connector_queries: list[str]) -> list[DemandRawSignal]:
            source_run = self.repository.create_demand_source_run(
                {
                    "user_id": user_id,
                    "run_id": run_id,
                    "source_type": connector.source_type,
                    "query": query,
                    "status": "running",
                    "requested_count": self.settings.demand_max_signals_per_source,
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "metadata": {"connector_key": connector.connector_key},
                },
            )
            try:
                response = connector.collect(
                    DemandConnectorRequest(
                        query=query,
                        expanded_queries=connector_queries,
                        max_results=min(
                            self.settings.demand_max_signals_per_source,
                            self.settings.demand_max_signals_per_run,
                        ),
                        project_id=pair.get("project_id"),
                        ad_lp_pair_id=pair.get("id"),
                        language=locale,
                        metadata={"pair_name": pair.get("name"), "pair": pair, "product_idea": product_idea},
                    ),
                )
                status = response.status if response.status in {"completed", "partial", "failed", "skipped"} else "partial"
                source_results.append(
                    self.repository.update_demand_source_run(
                        user_id=user_id,
                        source_run_id=source_run["id"],
                        payload={
                            "status": status,
                            "collected_count": len(response.signals),
                            "stored_count": len(response.signals),
                            "error_message": response.error_message,
                            "completed_at": datetime.now(timezone.utc).isoformat(),
                            "metadata": {**response.metadata, "connector_key": connector.connector_key},
                        },
                    ),
                )
                if response.error_message:
                    self.repository.create_demand_connector_log(
                        {
                            "user_id": user_id,
                            "run_id": run_id,
                            "source_run_id": source_run["id"],
                            "connector_key": connector.connector_key,
                            "level": "warning" if response.signals else "error",
                            "message": response.error_message,
                            "metadata": response.metadata,
                        },
                    )
                return response.signals
            except Exception as exc:
                source_results.append(
                    self.repository.update_demand_source_run(
                        user_id=user_id,
                        source_run_id=source_run["id"],
                        payload={
                            "status": "failed",
                            "error_message": str(exc),
                            "completed_at": datetime.now(timezone.utc).isoformat(),
                        },
                    ),
                )
                self.repository.create_demand_connector_log(
                    {
                        "user_id": user_id,
                        "run_id": run_id,
                        "source_run_id": source_run["id"],
                        "connector_key": connector.connector_key,
                        "level": "error",
                        "message": str(exc),
                        "metadata": {},
                    },
                )
                return []

        if not self.settings.demand_real_sources_enabled:
            all_signals.extend(execute_connector(self.connector_registry.synthetic, expanded["synthetic"]))
        else:
            google = self.connector_registry.google
            firecrawl_search = self.connector_registry.firecrawl_search
            firecrawl = self.connector_registry.firecrawl
            google_signals: list[DemandRawSignal] = []
            firecrawl_search_signals: list[DemandRawSignal] = []

            if google.is_configured(self.settings):
                google_signals = execute_connector(google, expanded["google_custom_search"])
                all_signals.extend(google_signals)
            else:
                record_skipped(google, "missing_api_key")

            if firecrawl_search.is_configured(self.settings):
                firecrawl_search_signals = execute_connector(firecrawl_search, expanded["firecrawl_search"])
                all_signals.extend(firecrawl_search_signals)
            else:
                reason = "disabled" if not self.settings.firecrawl_search_enabled else "missing_api_key"
                record_skipped(firecrawl_search, reason)

            discovered_urls = [
                signal.url
                for signal in [*google_signals, *firecrawl_search_signals]
                if signal.url
            ]
            firecrawl_urls = _unique_urls([*expanded["firecrawl"], *discovered_urls])
            if firecrawl.is_configured(self.settings):
                if firecrawl_urls:
                    all_signals.extend(execute_connector(firecrawl, firecrawl_urls))
                else:
                    record_skipped(firecrawl, "no_urls")
            else:
                record_skipped(firecrawl, "missing_api_key")

            if not all_signals and self.settings.demand_synthetic_fallback:
                all_signals.extend(execute_connector(self.connector_registry.synthetic, expanded["synthetic"]))

        summary = {
            "real_sources_enabled": self.settings.demand_real_sources_enabled,
            "synthetic_fallback": self.settings.demand_synthetic_fallback,
            "sources": source_results,
            "completed_count": sum(1 for item in source_results if item.get("status") == "completed"),
            "partial_count": sum(1 for item in source_results if item.get("status") == "partial"),
            "failed_count": sum(1 for item in source_results if item.get("status") == "failed"),
            "skipped_count": sum(1 for item in source_results if item.get("status") == "skipped"),
            "collected_count": len(all_signals),
            "real_signal_count": sum(1 for item in all_signals if item.connector_key != "synthetic"),
            "synthetic_signal_count": sum(1 for item in all_signals if item.connector_key == "synthetic"),
        }
        summary["evidence_status"] = (
            "real"
            if summary["real_signal_count"] and not summary["synthetic_signal_count"]
            else "mixed"
            if summary["real_signal_count"]
            else "synthetic"
            if summary["synthetic_signal_count"]
            else "insufficient"
        )
        return all_signals[: self.settings.demand_max_signals_per_run], summary

    def _normalize_signals(self, raw_signals: list[DemandRawSignal]) -> list[DemandNormalizedSignal]:
        seen: set[str] = set()
        normalized: list[DemandNormalizedSignal] = []
        replacements = {
            "まじだるい": "面倒",
            "めんどくさい": "面倒",
            "つらい": "負担が大きい",
            "欲しい": "必要",
        }
        for index, signal in enumerate(raw_signals):
            text = signal.body.strip()
            for before, after in replacements.items():
                text = text.replace(before, after)
            text = text.replace("報告書", "広告レポート").replace("資料", "共有資料")
            key = text.lower()
            is_duplicate = key in seen
            seen.add(key)
            quality = max(20, min(100, len(text) // 2 + sum(signal.engagement.values())))
            noise_score = 0.65 if len(text) < 24 else 0.15 if len(text) < 60 else 0.05
            is_ad = "キャンペーン" in text and "今だけ" in text
            spam_score = 0.75 if is_ad else 0.05
            normalized.append(
                DemandNormalizedSignal(
                    raw_signal_index=index,
                    normalized_text=text,
                    quality_score=0 if is_duplicate else quality,
                    noise_score=noise_score,
                    spam_score=spam_score,
                    duplicate_group_id=sha256(key.encode("utf-8")).hexdigest()[:16],
                    is_spam=False,
                    is_ad=is_ad,
                    is_bot=False,
                ),
            )
        return normalized

    def _extract_pains(self, normalized: list[DemandNormalizedSignal], *, locale: str = "ja") -> list[DemandExtractedItem]:
        if locale != "ja":
            return self._extract_items(
                normalized,
                [
                    ("Manual work takes too long", "Workload", ["manual", "takes too long", "time-consuming", "every time"]),
                    ("Setup and onboarding are difficult", "Complexity", ["setup", "onboarding", "difficult to use", "complex"]),
                    ("Value for money is unclear", "Cost", ["pricing", "expensive", "value is unclear", "cost"]),
                    ("Results are difficult to explain", "Trust", ["evidence", "difficult to explain", "trust", "unclear results"]),
                    ("Managing multiple tools is cumbersome", "Operations", ["multiple tools", "fragmented", "cumbersome", "workflow"]),
                    ("Priorities are unclear", "Decision making", ["prioritize", "priority", "what to improve", "cannot decide"]),
                ],
                default_category="Other",
            )
        release_rules = [
            ("手作業に時間がかかる", "作業負荷", ["手作業", "時間がかか", "毎回", "manual"]),
            ("設定や導入が複雑", "複雑さ", ["設定", "複雑", "使い始め", "setup"]),
            ("費用対効果が分かりにくい", "コスト", ["料金", "高い", "効果が分かり", "pricing"]),
            ("結果の根拠を説明しにくい", "信頼性", ["根拠", "説明しにく", "信頼", "evidence"]),
            ("複数ツールの運用が煩雑", "運用", ["複数", "煩雑", "まとめる", "workflow"]),
            ("改善の優先順位が分からない", "意思決定", ["優先順位", "判断でき", "何を改善", "priorit"]),
        ]
        release_items = self._extract_items(normalized, release_rules, default_category="その他")
        if release_items:
            return release_items
        rules = [
            ("広告レポート作成が面倒", "レポート作成", ["レポート", "共有資料", "説明文"]),
            ("広告分析が難しい", "分析", ["分析", "CTR", "CVR", "改善"]),
            ("媒体横断管理が面倒", "運用", ["複数媒体", "媒体", "管理"]),
            ("導入と設定が面倒", "複雑さ", ["設定", "導入", "学習コスト"]),
            ("競合ツールが高い", "コスト", ["高い", "価格"]),
            ("LPとの整合確認が面倒", "自動化不足", ["LP", "ズレ", "整合"]),
        ]
        return self._extract_items(normalized, rules, default_category="その他")

    def _extract_desires(self, normalized: list[DemandNormalizedSignal], *, locale: str = "ja") -> list[DemandExtractedItem]:
        if locale != "ja":
            return self._extract_items(
                normalized,
                [
                    ("Automate repetitive work", "Automation", ["automate", "automation"]),
                    ("Start using it easily", "Ease of use", ["easy to use", "simple", "quick setup"]),
                    ("Make evidence visible", "Visibility", ["evidence", "visibility", "explainable"]),
                    ("Unify information in one place", "Integration", ["all-in-one", "integrate", "one place", "unify"]),
                    ("Make decisions faster", "Speed", ["faster", "save time", "quickly", "speed"]),
                ],
                default_category="Improvement",
            )
        release_rules = [
            ("作業を自動化したい", "自動化", ["自動化", "automation"]),
            ("簡単に使い始めたい", "簡単さ", ["簡単", "すぐ使", "simple"]),
            ("根拠を見える化したい", "可視化", ["根拠", "見える", "可視化", "evidence"]),
            ("情報を一つにまとめたい", "統合", ["まとめ", "一つ", "統合", "all-in-one"]),
            ("判断を速くしたい", "速度", ["速く", "時間短縮", "すぐ", "faster"]),
        ]
        release_items = self._extract_items(normalized, release_rules, default_category="改善")
        if release_items:
            return release_items
        rules = [
            ("広告レポートを自動化したい", "自動化したい", ["自動化", "レポート", "グラフ"]),
            ("広告分析を簡単にしたい", "簡単にしたい", ["簡単", "分かりません", "難しく"]),
            ("改善アクションを見える化したい", "見える化したい", ["改善", "アクション", "示唆"]),
            ("顧客共有を早くしたい", "早くしたい", ["共有", "クライアント", "時間"]),
            ("広告とLPを統合管理したい", "統合したい", ["LP", "媒体", "一気通貫"]),
        ]
        return self._extract_items(normalized, rules, default_category="改善したい")

    def _extract_items(
        self,
        normalized: list[DemandNormalizedSignal],
        rules: list[tuple[str, str, list[str]]],
        *,
        default_category: str,
    ) -> list[DemandExtractedItem]:
        items: list[DemandExtractedItem] = []
        for name, category, keywords in rules:
            indexes = [
                signal.raw_signal_index
                for signal in normalized
                if signal.quality_score > 0 and any(keyword.lower() in signal.normalized_text.lower() for keyword in keywords)
            ]
            if not indexes:
                continue
            items.append(
                DemandExtractedItem(
                    name=name,
                    category=category or default_category,
                    intensity=min(100, 52 + len(indexes) * 9),
                    confidence=min(0.95, 0.58 + len(indexes) * 0.06),
                    target_user=self._persona_for(name),
                    evidence_signal_indexes=indexes,
                ),
            )
        return items

    def _extract_churn_reasons(self, normalized: list[DemandNormalizedSignal], *, locale: str = "ja") -> list[DemandExtractedItem]:
        if locale != "ja":
            return self._extract_items(
                normalized,
                [
                    ("Pricing is too high", "Cost", ["too expensive", "pricing", "high price", "cost"]),
                    ("The product is difficult to use", "Complexity", ["difficult to use", "complex", "confusing"]),
                    ("Setup takes too much effort", "Complexity", ["setup", "onboarding", "too much effort"]),
                    ("The impact is unclear", "Trust", ["unclear impact", "unclear results", "no evidence"]),
                    ("Support is insufficient", "Support", ["support is slow", "poor support", "insufficient support"]),
                ],
                default_category="Other",
            )
        release_rules = [
            ("価格が高い", "コスト", ["高い", "料金", "price"]),
            ("使い方が難しい", "複雑さ", ["難しい", "複雑", "分かりにく"]),
            ("設定に手間がかかる", "複雑さ", ["設定", "導入", "手間"]),
            ("効果が見えない", "信頼性", ["効果", "見えない", "根拠"]),
            ("サポートが不足している", "サポート", ["サポート", "問い合わせ"]),
        ]
        release_items = self._extract_items(normalized, release_rules, default_category="その他")
        if release_items:
            return release_items
        rules = [
            ("高い", "コスト", ["高い", "価格"]),
            ("難しい", "複雑さ", ["難しい", "学習コスト", "使いこなす"]),
            ("設定が面倒", "複雑さ", ["設定", "導入"]),
            ("効果が見えない", "信頼性", ["効果", "見える"]),
            ("サポートが弱い", "サポート不足", ["サポート", "弱い"]),
        ]
        return self._extract_items(normalized, rules, default_category="その他")

    def _embed(self, text: str) -> list[float]:
        digest = sha256(text.encode("utf-8")).digest()
        raw = [byte / 255 for byte in digest[:16]]
        norm = sqrt(sum(value * value for value in raw)) or 1
        return [round(value / norm, 6) for value in raw]

    def _cluster(
        self,
        *,
        normalized: list[DemandNormalizedSignal],
        pains: list[DemandExtractedItem],
        desires: list[DemandExtractedItem],
        locale: str = "ja",
    ) -> list[DemandCluster]:
        clusters: list[DemandCluster] = []
        for cluster_type, items in [("pain", pains), ("desire", desires)]:
            for index, item in enumerate(items):
                quotes = [
                    normalized[signal_index].normalized_text
                    for signal_index in item.evidence_signal_indexes[:3]
                    if signal_index < len(normalized)
                ]
                source_count = len(set(item.evidence_signal_indexes))
                growth_rate = round(0.08 + source_count * 0.035 + index * 0.01, 3)
                trend = (
                    ("急増" if growth_rate >= 0.22 else "増加" if growth_rate >= 0.12 else "横ばい")
                    if locale == "ja"
                    else ("spike" if growth_rate >= 0.22 else "growing" if growth_rate >= 0.12 else "stable")
                )
                score = self._demand_score(count=len(item.evidence_signal_indexes), source_count=source_count, intensity=item.intensity, confidence=item.confidence)
                clusters.append(
                    DemandCluster(
                        id=f"{cluster_type}_{index + 1}",
                        cluster_type=cluster_type,  # type: ignore[arg-type]
                        name=item.name,
                        category=item.category,
                        count=len(item.evidence_signal_indexes) * 37,
                        source_count=source_count,
                        representative_quotes=quotes,
                        growth_rate=growth_rate,
                        confidence=item.confidence,
                        persona_ratios=self._persona_ratios(item.target_user, locale=locale),
                        root_causes=self._root_causes(item.name, locale=locale),
                        demand_signal_score=score,
                        trend=trend,  # type: ignore[arg-type]
                        evidence_signal_indexes=item.evidence_signal_indexes,
                    ),
                )
        return sorted(clusters, key=lambda cluster: cluster.demand_signal_score, reverse=True)

    def _analyze_competitors(
        self,
        *,
        query: str,
        normalized: list[DemandNormalizedSignal],
        churn_reasons: list[DemandExtractedItem],
        locale: str = "ja",
    ) -> list[DemandCompetitor]:
        if locale != "ja":
            complaints = [item.name for item in churn_reasons] or ["Pricing is too high", "Setup takes too much effort"]
            return [
                DemandCompetitor(
                    service_name=f"{query} Cloud",
                    price="Subscription pricing may feel expensive for small teams.",
                    main_features=["Data aggregation", "Report exports", "Dashboard"],
                    strengths=["Channel data visibility", "Standard reports"],
                    weaknesses=["Weak improvement recommendations", "Weak ad-to-LP alignment review"],
                    reviews=[signal.normalized_text for signal in normalized[:2]],
                    complaints=complaints[:4],
                    rating=3.6,
                    market_position="Operational visibility",
                ),
                DemandCompetitor(
                    service_name=f"{query} Report Pro",
                    price="Many useful features require a higher-tier plan.",
                    main_features=["Report automation", "Shareable URLs", "Templates"],
                    strengths=["Faster report creation", "Easy sharing"],
                    weaknesses=["Shallow explanation of analysis", "Heavy setup"],
                    reviews=[signal.normalized_text for signal in normalized[2:4]],
                    complaints=complaints[:4],
                    rating=3.8,
                    market_position="Report automation",
                ),
            ]
        complaints = [item.name for item in churn_reasons] or ["高い", "設定が面倒"]
        return [
            DemandCompetitor(
                service_name=f"{query} Cloud",
                price="月額課金。小規模チームには高く見えやすい。",
                main_features=["広告データ集計", "レポート出力", "ダッシュボード"],
                strengths=["媒体データの可視化", "定型レポート"],
                weaknesses=["改善案生成が弱い", "LP整合性の確認が弱い"],
                reviews=[signal.normalized_text for signal in normalized[:2]],
                complaints=complaints[:4],
                rating=3.6,
                market_position="既存運用の可視化寄り",
            ),
            DemandCompetitor(
                service_name=f"{query} Report Pro",
                price="上位プラン前提の機能が多い。",
                main_features=["レポート自動化", "共有URL", "テンプレート"],
                strengths=["資料作成の時短", "共有しやすい"],
                weaknesses=["分析理由の説明が浅い", "導入設定が重い"],
                reviews=[signal.normalized_text for signal in normalized[2:4]],
                complaints=complaints[:4],
                rating=3.8,
                market_position="レポート自動化特化",
            ),
        ]

    def _market_gaps(self, *, clusters: list[DemandCluster], competitors: list[DemandCompetitor], locale: str = "ja") -> list[dict[str, Any]]:
        competitor_weaknesses = [weakness for competitor in competitors for weakness in competitor.weaknesses]
        gaps: list[dict[str, Any]] = []
        for cluster in clusters[:6]:
            unresolved = any(
                marker in weakness.lower()
                for weakness in competitor_weaknesses
                for marker in (["弱い", "浅い", "重い"] if locale == "ja" else ["weak", "shallow", "heavy"])
            )
            gap_score = min(100, cluster.demand_signal_score + (12 if unresolved else 0))
            gaps.append(
                {
                    "name": cluster.name,
                    "gap_score": gap_score,
                    "evidence": cluster.representative_quotes,
                    "related_clusters": [cluster.id],
                    "competitor_weaknesses": competitor_weaknesses[:4],
                },
            )
        return gaps

    def _opportunities(self, *, gaps: list[dict[str, Any]], locale: str = "ja") -> list[DemandOpportunity]:
        if locale != "ja":
            return [
                DemandOpportunity(
                    name=f"Turn {gap['name']} into an improvement workflow",
                    description="Connect market evidence to positioning, landing-page changes, and the next measurable test.",
                    evidence=gap["evidence"],
                    related_clusters=gap["related_clusters"],
                    related_competitors=[],
                    expected_value="Operators can decide what to improve next with clearer evidence.",
                    risks=["Treat limited evidence as a hypothesis", "Do not claim guaranteed demand or success"],
                )
                for gap in gaps[:4]
            ]
        return [
            DemandOpportunity(
                name=f"{gap['name']}を広告改善ワークフローへ変換する",
                description="市場の声を単なる調査結果で終わらせず、広告訴求、LP改善、次施策へ接続する。",
                evidence=gap["evidence"],
                related_clusters=gap["related_clusters"],
                related_competitors=[],
                expected_value="運用者が次に何を直すべきか判断しやすくなる。",
                risks=["根拠件数が少ない場合は仮説扱いにする", "需要や成功を断定しない"],
            )
            for gap in gaps[:4]
        ]

    def _feature_suggestions(self, *, opportunities: list[DemandOpportunity], locale: str = "ja") -> list[DemandFeatureSuggestion]:
        suggestions = [
            ("Evidence Explorer", "根拠投稿、レビュー、検索シグナルへ遡れる一覧", "high"),
            ("Demand Cluster Board", "不満・欲求クラスタをスコア順に比較する画面", "high"),
            ("Competitor Gap Analyzer", "競合が解決できていない不満を抽出する", "medium"),
            ("Ad/LP Appeal Generator", "需要シグナルを広告訴求とLP改善案へ変換する", "high"),
        ]
        solves = [opportunity.name for opportunity in opportunities]
        if locale != "ja":
            return [
                DemandFeatureSuggestion(
                    feature_name=name,
                    solves=solves[:3],
                    reason="Connect demand evidence to product and campaign decisions.",
                    priority=priority,  # type: ignore[arg-type]
                    mvp=f"Show {name} items, scores, and evidence links.",
                    expansion=f"Add trends, filters, and exports to {name}.",
                )
                for name, _, priority in suggestions
            ]
        return [
            DemandFeatureSuggestion(
                feature_name=name,
                solves=solves[:3],
                reason="需要シグナルから意思決定と広告改善へ接続するため。",
                priority=priority,  # type: ignore[arg-type]
                mvp=f"{name} の一覧、スコア、根拠リンクを表示する。",
                expansion=f"{name} を時系列比較、フィルタ、エクスポートへ拡張する。",
            )
            for name, _, priority in suggestions
        ]

    def _positioning(self, *, query: str, gaps: list[dict[str, Any]], competitors: list[DemandCompetitor], locale: str = "ja") -> DemandPositioning:
        if locale != "ja":
            return DemandPositioning(
                recommended_position=f"Evidence-backed demand and campaign improvement for {query}",
                differentiation_points=[
                    "Turn public complaints and desires into testable positioning",
                    "Review competitor gaps and landing-page changes together",
                    "Trace recommendations back to evidence instead of relying on AI claims",
                ],
                competitor_comparison=[f"{competitor.service_name}: {', '.join(competitor.weaknesses)}" for competitor in competitors],
                key_messages=[
                    "Decide the next improvement from real market evidence.",
                    "Make pains, desires, and competitor gaps visible.",
                    "Connect demand evidence to ads and landing pages.",
                ],
            )
        return DemandPositioning(
            recommended_position=f"{query}向けの需要根拠つき広告改善OS",
            differentiation_points=[
                "ネット上の不満と欲求を広告訴求へ変換する",
                "競合ギャップとLP改善案を同じ画面で扱う",
                "AI結論ではなくEvidence Explorerで根拠へ遡れる",
            ],
            competitor_comparison=[
                f"{competitor.service_name}: {', '.join(competitor.weaknesses)}"
                for competitor in competitors
            ],
            key_messages=[
                "市場の声から、次の広告改善を決める。",
                "不満、欲求、競合ギャップを根拠つきで可視化。",
                "広告とLPの改善案まで一気通貫で接続。",
            ],
        )

    def _ad_appeals(self, *, query: str, clusters: list[DemandCluster], positioning: DemandPositioning, locale: str = "ja") -> list[DemandAdAppeal]:
        if locale != "ja":
            top = clusters[0].name if clusters else "unclear campaign decisions"
            return [
                DemandAdAppeal(
                    appeal_axis=top,
                    hooks=[f"For teams struggling with {top}", "Are campaign decisions still based on guesswork?"],
                    headlines=["Find campaign improvements from market evidence", f"Turn {query} complaints into testable messaging"],
                    bodies=[
                        "Structure public complaints, desires, and competitor gaps into ad and landing-page improvements.",
                        "Trace every recommendation back to collected evidence instead of relying on AI conclusions alone.",
                    ],
                    ctas=["View demand signals", "Find improvement opportunities"],
                ),
            ]
        top = clusters[0].name if clusters else "広告改善の判断負荷"
        return [
            DemandAdAppeal(
                appeal_axis=top,
                hooks=[
                    f"{top}に悩む運用者へ",
                    "広告改善の根拠、まだ勘で探していませんか",
                ],
                headlines=[
                    "市場の声から広告改善を見つける",
                    f"{query}の不満を広告訴求に変換",
                ],
                bodies=[
                    "ネット上の不満、欲求、競合ギャップを構造化し、広告とLPの改善案へつなげます。",
                    "AIの結論だけでなく、元投稿やレビューまで遡れる需要インテリジェンスです。",
                ],
                ctas=["需要シグナルを見る", "改善機会を探す"],
            ),
        ]

    def _lp_context(self, *, clusters: list[DemandCluster], opportunities: list[DemandOpportunity], locale: str = "ja") -> DemandLPContext:
        if locale != "ja":
            top = clusters[0].name if clusters else "an unresolved market problem"
            return DemandLPContext(
                hero_improvements=[f"State a clear solution hypothesis for '{top}' in the hero"],
                cta_improvements=["Use a CTA that invites users to inspect improvement opportunities"],
                faq_ideas=["Does this guarantee demand?", "Can I inspect the underlying evidence?", "How are competitors compared?"],
                section_ideas=["Top Demand Signals", "Evidence Explorer", "Competitor Gaps", "Recommended Features"],
                structure_improvements=["Order the page as conclusion, evidence, opportunity, and next test"],
            )
        top = clusters[0].name if clusters else "市場の未解決課題"
        return DemandLPContext(
            hero_improvements=[f"ヒーローで「{top}」への解決仮説を明示する"],
            cta_improvements=["CTAは調査ではなく、改善機会の確認を促す文言にする"],
            faq_ideas=["需要を断定しているのか？", "根拠シグナルは確認できるのか？", "競合比較はどのように扱うのか？"],
            section_ideas=["Top Demand Signals", "Evidence Explorer", "Competitor Gaps", "Recommended Features"],
            structure_improvements=["結論、根拠、機会、広告/LP改善案の順に配置する"],
        )

    def _summary(
        self,
        *,
        query: str,
        raw_signals: list[DemandRawSignal],
        normalized: list[DemandNormalizedSignal],
        pains: list[DemandExtractedItem],
        desires: list[DemandExtractedItem],
        clusters: list[DemandCluster],
        competitors: list[DemandCompetitor],
        gaps: list[dict[str, Any]],
        opportunities: list[DemandOpportunity],
        features: list[DemandFeatureSuggestion],
        positioning: DemandPositioning,
        ad_appeals: list[DemandAdAppeal],
        lp_context: DemandLPContext,
        source_status_summary: dict[str, Any] | None = None,
        validation_summary: dict[str, Any] | None = None,
        solution_fit_summary: dict[str, Any] | None = None,
        monitoring_summary: dict[str, Any] | None = None,
        search_demand_summary: dict[str, Any] | None = None,
        market_size_summary: dict[str, Any] | None = None,
        outcome_learning_summary: dict[str, Any] | None = None,
        locale: str = "ja",
    ) -> DemandIntelligenceSummary:
        source_status_summary = source_status_summary or {}
        validation_summary = validation_summary or {}
        solution_fit_summary = solution_fit_summary or {}
        monitoring_summary = monitoring_summary or {}
        search_demand_summary = search_demand_summary or {}
        market_size_summary = market_size_summary or {}
        outcome_learning_summary = outcome_learning_summary or {}
        pain_clusters = [cluster for cluster in clusters if cluster.cluster_type == "pain"]
        desire_clusters = [cluster for cluster in clusters if cluster.cluster_type == "desire"]
        evidence = [
            {
                "label": cluster.name,
                "count": cluster.count,
                "signal_indexes": cluster.evidence_signal_indexes,
                "quotes": cluster.representative_quotes,
            }
            for cluster in clusters[:8]
        ]
        is_ja = locale == "ja"
        return DemandIntelligenceSummary(
            overview=(
                f"{query}について、日本市場を優先した需要インテリジェンスを生成しました。"
                "これは需要有無や成功可否の断定ではなく、ネット上の声を構造化した意思決定材料です。"
                if is_ja
                else f"Generated demand intelligence for {query}. This is structured decision support, not a demand verdict, success prediction, or revenue forecast."
            ),
            top_pain_clusters=[cluster.model_dump(mode="json") for cluster in pain_clusters[:5]],
            top_desire_clusters=[cluster.model_dump(mode="json") for cluster in desire_clusters[:5]],
            top_demand_signals=[cluster.model_dump(mode="json") for cluster in clusters[:5]],
            emerging_trends=[
                {"cluster": cluster.name, "trend": cluster.trend, "growth_rate": cluster.growth_rate}
                for cluster in clusters[:5]
            ],
            competitor_gaps=gaps,
            opportunities=opportunities,
            recommended_features=features,
            recommended_positioning=positioning,
            ad_appeals=ad_appeals,
            lp_improvement_context=lp_context,
            evidence_summary=evidence,
            guardrails=[
                "需要の有無を断定しない" if is_ja else "Do not assert whether demand exists.",
                "成功失敗を断定しない" if is_ja else "Do not predict success or failure.",
                "売上予測として扱わない" if is_ja else "Do not treat this as a revenue forecast.",
                "AIの結論だけを表示せず、根拠シグナルへ遡れるようにする" if is_ja else "Every conclusion must remain traceable to evidence signals.",
            ],
            source_status_summary=source_status_summary,
            validation_summary=validation_summary,
            solution_fit_summary=solution_fit_summary,
            monitoring_summary=monitoring_summary,
            search_demand_summary=search_demand_summary,
            market_size_summary=market_size_summary,
            outcome_learning_summary=outcome_learning_summary,
            pair_analysis_context={
                "market_insights": [
                    {
                        "finding": cluster.name,
                        "evidence": "; ".join(cluster.representative_quotes[:2]),
                        "recommendation": (
                            "広告訴求とLPファーストビューで根拠つき仮説として扱う"
                            if is_ja
                            else "Treat this as an evidence-backed hypothesis for ad messaging and the LP hero."
                        ),
                    }
                    for cluster in clusters[:4]
                ],
                "competitor_summary": [
                    f"{competitor.service_name}: {', '.join(competitor.weaknesses)}"
                    for competitor in competitors
                ],
                "pain_point_alignment": [
                    {
                        "finding": item.name,
                        "evidence": f"{len(item.evidence_signal_indexes)} signals",
                        "recommendation": (
                            "広告の約束とLPの証拠が一致しているか確認する"
                            if is_ja
                            else "Check whether the ad promise matches the evidence on the landing page."
                        ),
                    }
                    for item in pains[:4]
                ],
                "positioning_opportunities": positioning.key_messages,
                "market_alignment_score": round(sum(cluster.demand_signal_score for cluster in clusters[:3]) / max(1, len(clusters[:3]))),
                "market_fit_analysis": (
                    "需要シグナルは方向性の参考情報です。広告とLPの整合性、根拠提示、競合ギャップへの接続を確認してください。"
                    if is_ja
                    else "Demand signals are directional evidence. Validate ad-to-LP alignment, proof, and competitor gaps before acting."
                ),
                "recommended_positioning": [positioning.recommended_position, *positioning.differentiation_points],
                "market_opportunities": [opportunity.name for opportunity in opportunities],
                "feature_suggestions": [feature.model_dump(mode="json") for feature in features],
                "demand_signal_scores": [
                    {"cluster": cluster.name, "score": cluster.demand_signal_score}
                    for cluster in clusters[:8]
                ],
                "trend_analysis": [
                    {"cluster": cluster.name, "trend": cluster.trend, "growth_rate": cluster.growth_rate}
                    for cluster in clusters[:8]
                ],
                "competitor_gaps": gaps,
                "root_causes": [
                    {"cluster": cluster.name, "root_causes": cluster.root_causes}
                    for cluster in clusters[:8]
                ],
                "evidence_summary": evidence,
                "validation_summary": validation_summary,
                "solution_fit_summary": solution_fit_summary,
                "monitoring_summary": monitoring_summary,
                "source_status_summary": source_status_summary,
                "search_demand_summary": search_demand_summary,
                "market_size_summary": market_size_summary,
                "outcome_learning_summary": outcome_learning_summary,
                "strong_validated_clusters": validation_summary.get("strong_validated_clusters", []),
                "weak_or_noisy_clusters": validation_summary.get("weak_or_noisy_clusters", []),
                "matched_solution_pains": solution_fit_summary.get("matched_solution_pains", []),
                "unmatched_solution_pains": solution_fit_summary.get("unmatched_solution_pains", []),
                "emerging_demand_signals": monitoring_summary.get("emerging_clusters", []),
                "growing_demand_signals": monitoring_summary.get("growing_clusters", []),
                "validated_demand_patterns": outcome_learning_summary.get("validated_demand_patterns", []),
                "failed_demand_patterns": outcome_learning_summary.get("failed_demand_patterns", []),
                "inconclusive_demand_patterns": outcome_learning_summary.get("inconclusive_demand_patterns", []),
                "promising_segments": market_size_summary.get("promising_segments", []),
                "small_market_warnings": market_size_summary.get("small_market_warnings", []),
                "recommended_next_tests": outcome_learning_summary.get("recommended_next_tests", []),
            },
        )

    @staticmethod
    def _demand_score(*, count: int, source_count: int, intensity: int, confidence: float) -> int:
        return min(100, round(count * 7 + source_count * 8 + intensity * 0.45 + confidence * 20))

    @staticmethod
    def _persona_for(name: str) -> str:
        if "レポート" in name or "媒体" in name:
            return "広告代理店"
        if "分析" in name or "改善" in name:
            return "マーケ担当"
        if "高い" in name:
            return "中小企業"
        lower = name.lower()
        if "report" in lower or "multiple tools" in lower:
            return "Agency"
        if "analysis" in lower or "priorit" in lower or "evidence" in lower:
            return "Marketer"
        if "pricing" in lower or "cost" in lower:
            return "Small business"
        return "その他"

    @staticmethod
    def _persona_ratios(primary: str, *, locale: str = "ja") -> dict[str, float]:
        personas = PERSONAS if locale == "ja" else ["Solo builder", "Freelancer", "Agency", "Small business", "Enterprise", "Marketer", "Founder", "Engineer", "Designer", "Other"]
        ratios = {persona: 0.0 for persona in personas}
        if primary not in ratios:
            primary = "その他" if locale == "ja" else "Other"
        ratios[primary] = 0.52
        marketer, agency, small = ("マーケ担当", "広告代理店", "中小企業") if locale == "ja" else ("Marketer", "Agency", "Small business")
        ratios[marketer] = max(ratios.get(marketer, 0), 0.18)
        ratios[agency] = max(ratios.get(agency, 0), 0.16)
        ratios[small] = max(ratios.get(small, 0), 0.14)
        total = sum(ratios.values()) or 1
        return {key: round(value / total, 3) for key, value in ratios.items() if value > 0}

    @staticmethod
    def _root_causes(name: str, *, locale: str = "ja") -> list[str]:
        if locale != "ja":
            roots = {
                "Manual work takes too long": ["Repeated data entry", "Manual formatting", "Fragmented data collection"],
                "Setup and onboarding are difficult": ["Too many setup steps", "Complex permissions", "Slow time to value"],
                "Value for money is unclear": ["Unclear outcomes", "Weak proof", "Pricing is difficult to justify"],
                "Results are difficult to explain": ["Missing evidence", "Black-box recommendations", "Inconsistent reporting"],
                "Managing multiple tools is cumbersome": ["Fragmented workflows", "Inconsistent metrics", "Context switching"],
                "Priorities are unclear": ["No decision framework", "Competing recommendations", "Unclear expected impact"],
            }
            return roots.get(name, ["The workflow is fragmented", "Decision evidence is difficult to inspect"])
        roots = {
            "広告レポート作成が面倒": ["媒体ごとの数値転記", "グラフ作成", "説明文作成", "報告資料作成", "データ収集"],
            "広告分析が難しい": ["指標の意味理解", "改善優先度の判断", "広告とLPの関係整理", "過去施策との比較"],
            "媒体横断管理が面倒": ["複数管理画面の往復", "数値定義の違い", "共有フォーマットの不一致"],
            "導入と設定が面倒": ["初期設定項目が多い", "権限連携が難しい", "効果確認まで時間がかかる"],
            "LPとの整合確認が面倒": ["広告訴求とLP見出しの差分確認", "CTA不一致", "証拠不足"],
        }
        return roots.get(name, ["運用工程が分断されている", "判断根拠が見えにくい"])


def _looks_uuid(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    parts = value.split("-")
    return len(parts) == 5 and all(parts)


def _unique_urls(urls: list[str]) -> list[str]:
    unique: dict[str, str] = {}
    tracking_keys = {"fbclid", "gclid", "ref", "source"}
    for url in urls:
        try:
            parts = urlsplit(url.strip())
            query = urlencode(
                [
                    (key, value)
                    for key, value in parse_qsl(parts.query, keep_blank_values=True)
                    if not key.lower().startswith("utm_") and key.lower() not in tracking_keys
                ],
            )
            normalized = urlunsplit(
                (
                    parts.scheme.lower(),
                    parts.netloc.lower(),
                    parts.path.rstrip("/") or "/",
                    query,
                    "",
                ),
            )
        except ValueError:
            normalized = url.strip()
        unique.setdefault(normalized, url)
    return list(unique.values())
