from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

from backend.services.ads.ad_collector_service import FullAdsCollection
from backend.services.ai.ad_improvement_service import AdImprovementResult
from backend.services.ai.diff_service import DiffResult
from backend.services.ai.feature_extractor import FeatureExtractor
from backend.services.ai.lp_improvement_service import LPImprovementResult
from backend.services.ai.review_service import ReviewResult
from backend.services.history.change_history_service import ChangeHistoryService
from backend.services.lp.lp_collector import LPCollection
from backend.services.demand.demand_intelligence_service import DemandIntelligenceService
from backend.services.orchestration.ai_orchestrator import AIOrchestrator
from backend.services.outcomes.improvement_outcome_service import ImprovementOutcomeService
from backend.services.supabase.supabase_repository import SupabaseRepository


class HistoryInsight(BaseModel):
    model_config = ConfigDict(extra="forbid")

    finding: str
    evidence: str
    recommendation: str


class FieldRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str
    current_value: str
    suggested_value: str
    reason: str
    expected_effect: str
    risk: str = Field(pattern="^(low|medium|high)$")


class DoNotChangeItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str
    reason: str


class NextTestPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hypothesis: str
    test_target: str
    success_metric: str
    duration_days: int = Field(ge=1)


class MarketAlignmentScore(BaseModel):
    model_config = ConfigDict(extra="forbid")

    score: int = Field(ge=0, le=100)
    reason: str


class HistoryAwareRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    overall_diagnosis: str
    likely_problem: str
    history_based_insights: list[HistoryInsight]
    ad_recommendations: list[FieldRecommendation]
    lp_recommendations: list[FieldRecommendation]
    do_not_change: list[DoNotChangeItem]
    next_test_plan: NextTestPlan
    market_insights: list[HistoryInsight] = Field(default_factory=list)
    competitor_summary: list[str] = Field(default_factory=list)
    pain_point_alignment: list[HistoryInsight] = Field(default_factory=list)
    positioning_opportunities: list[str] = Field(default_factory=list)
    market_alignment_score: int = Field(default=0, ge=0, le=100)
    market_fit_analysis: str = ""
    recommended_positioning: list[str] = Field(default_factory=list)
    market_opportunities: list[str] = Field(default_factory=list)
    feature_suggestions: list[dict[str, Any]] = Field(default_factory=list)
    demand_signal_scores: list[dict[str, Any]] = Field(default_factory=list)
    trend_analysis: list[dict[str, Any]] = Field(default_factory=list)
    competitor_gaps: list[dict[str, Any]] = Field(default_factory=list)
    root_causes: list[dict[str, Any]] = Field(default_factory=list)
    evidence_summary: list[dict[str, Any]] = Field(default_factory=list)
    validation_summary: dict[str, Any] = Field(default_factory=dict)
    solution_fit_summary: dict[str, Any] = Field(default_factory=dict)
    monitoring_summary: dict[str, Any] = Field(default_factory=dict)
    source_status_summary: dict[str, Any] = Field(default_factory=dict)
    strong_validated_clusters: list[dict[str, Any]] = Field(default_factory=list)
    weak_or_noisy_clusters: list[dict[str, Any]] = Field(default_factory=list)
    matched_solution_pains: list[str] = Field(default_factory=list)
    unmatched_solution_pains: list[str] = Field(default_factory=list)
    emerging_demand_signals: list[dict[str, Any]] = Field(default_factory=list)
    growing_demand_signals: list[dict[str, Any]] = Field(default_factory=list)
    search_demand_summary: dict[str, Any] = Field(default_factory=dict)
    market_size_summary: dict[str, Any] = Field(default_factory=dict)
    outcome_learning_summary: dict[str, Any] = Field(default_factory=dict)
    validated_demand_patterns: list[str] = Field(default_factory=list)
    failed_demand_patterns: list[str] = Field(default_factory=list)
    inconclusive_demand_patterns: list[str] = Field(default_factory=list)
    promising_segments: list[dict[str, Any]] = Field(default_factory=list)
    small_market_warnings: list[str] = Field(default_factory=list)
    recommended_next_tests: list[str] = Field(default_factory=list)
    outcome_insights: list[HistoryInsight] = Field(default_factory=list)
    successful_improvement_patterns: list[str] = Field(default_factory=list)
    failed_improvement_patterns: list[str] = Field(default_factory=list)
    outcome_based_warnings: list[str] = Field(default_factory=list)
    recommended_next_measurement: str = ""


class LLMClient(Protocol):
    def generate_json(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
        response_model: type[BaseModel],
    ) -> dict[str, Any]:
        ...


class RegisteredPairAnalysisService:
    def __init__(
        self,
        *,
        repository: SupabaseRepository,
        change_history_service: ChangeHistoryService,
        feature_extractor: FeatureExtractor,
        llm_client: LLMClient,
        openai_llm_client: LLMClient | None = None,
        demand_intelligence_service: DemandIntelligenceService | None = None,
        outcome_service: ImprovementOutcomeService | None = None,
        orchestrator: AIOrchestrator | None = None,
    ) -> None:
        self.repository = repository
        self.change_history_service = change_history_service
        self.feature_extractor = feature_extractor
        self.llm_client = llm_client
        self.openai_llm_client = openai_llm_client
        self.demand_intelligence_service = demand_intelligence_service
        self.outcome_service = outcome_service
        self.orchestrator = orchestrator or AIOrchestrator(repository=repository)

    def run(self, *, user_id: str, pair_id: str, ai_mode: str = "multi_provider", locale: str = "ja") -> dict[str, Any]:
        if ai_mode not in {"multi_provider", "openai_only"}:
            raise ValueError("Invalid ai_mode.")
        if ai_mode == "openai_only" and self.openai_llm_client is None:
            raise ValueError("OPENAI_API_KEY and OPENAI_FAST_MODEL or OPENAI_MODEL are required for openai_only analysis.")
        pair = self.repository.get_one("ad_lp_pairs", user_id=user_id, filters={"id": pair_id})
        twitter_ad = self.repository.get_one(
            "twitter_ads",
            user_id=user_id,
            filters={"id": pair["twitter_ad_id"]},
        )
        landing_page = self.repository.get_one(
            "landing_pages",
            user_id=user_id,
            filters={"id": pair["landing_page_id"]},
        )
        history = self.change_history_service.list_for_pair(user_id=user_id, pair=pair)
        previous_runs = self.repository.get_many(
            "analysis_runs",
            user_id=user_id,
            filters={"ad_lp_pair_id": pair_id},
            order="created_at.desc",
            limit=5,
        )
        demand_intelligence = (
            self.demand_intelligence_service.latest_context_for_pair(user_id=user_id, pair_id=pair_id)
            if self.demand_intelligence_service
            else None
        )
        outcome_context = (
            self.outcome_service.get_outcome_context_for_analysis(user_id=user_id, pair_id=pair_id)
            if self.outcome_service
            else {
                "recent_outcomes": [],
                "successful_patterns": [],
                "failed_patterns": [],
                "inconclusive_patterns": [],
            }
        )

        ads_collection = self._to_ads_collection(twitter_ad)
        lp_collection = self._to_lp_collection(landing_page)
        features = self.feature_extractor.extract(ads_collection, lp_collection)
        message_match_score = self._message_match_score(twitter_ad, landing_page)
        risk_level = self._risk_level(features.hero_similarity, features.cta_strength, landing_page)
        score = round((features.hero_similarity + features.cta_strength + message_match_score + max(0, 100 - features.bounce_rate)) / 4)
        recommendation_client = self.openai_llm_client if ai_mode == "openai_only" else self.llm_client
        orchestration = self.orchestrator.run_pair_pipeline(
            user_id=user_id,
            project_id=pair.get("project_id"),
            pair_id=pair_id,
            platform="twitter",
            objective="pair_analysis_with_review_and_diff_readiness",
            context={
                "ai_mode": ai_mode,
                "locale": locale,
                "twitter_ad": twitter_ad,
                "landing_page": landing_page,
                "pair": pair,
                "history": history,
                "previous_runs": previous_runs,
                "demand_intelligence": demand_intelligence,
                "improvement_outcomes": outcome_context,
                "features": features.model_dump(mode="json"),
                "message_match_score": message_match_score,
                "risk_level": risk_level,
                "provider_type": getattr(recommendation_client, "provider_type", "MOCK"),
                "failure_reason": getattr(recommendation_client, "failure_reason", "Unknown AI client provenance."),
                "source_provider": getattr(recommendation_client, "source_provider", type(recommendation_client).__name__),
            },
            mode=ai_mode,
        )

        recommendation = self._recommend(
            ai_mode=ai_mode,
            locale=locale,
            twitter_ad=twitter_ad,
            landing_page=landing_page,
            pair=pair,
            history=history,
            previous_runs=previous_runs,
            demand_intelligence=demand_intelligence,
            improvement_outcomes=outcome_context,
            features=features.model_dump(),
            message_match_score=message_match_score,
            risk_level=risk_level,
        )

        ad_improvements = self._ad_improvements(recommendation)
        lp_improvements = self._lp_improvements(recommendation)
        diff_plan = self._diff_plan(recommendation)
        review_result = self._review_result(recommendation, risk_level)

        result = self.repository.insert(
            "analysis_runs",
            {
                "user_id": user_id,
                "project_id": pair.get("project_id"),
                "ad_lp_pair_id": pair_id,
                "score": score,
                "ctr_trend": features.ctr_trend,
                "hero_similarity": features.hero_similarity,
                "cta_strength": features.cta_strength,
                "bounce_rate": features.bounce_rate,
                "risk_level": risk_level,
                "provider_type": getattr(recommendation_client, "provider_type", "MOCK"),
                "failure_reason": getattr(recommendation_client, "failure_reason", "Unknown AI client provenance."),
                "source_provider": getattr(recommendation_client, "source_provider", type(recommendation_client).__name__),
                "ad_improvements": ad_improvements.model_dump(mode="json"),
                "lp_improvements": lp_improvements.model_dump(mode="json"),
                "diff_plan": diff_plan.model_dump(mode="json"),
                "review_result": review_result.model_dump(mode="json"),
                "history_insights": {
                    **recommendation.model_dump(mode="json"),
                    "ai_mode": ai_mode,
                    "provider_type": getattr(recommendation_client, "provider_type", "MOCK"),
                    "failure_reason": getattr(recommendation_client, "failure_reason", "Unknown AI client provenance."),
                    "source_provider": getattr(recommendation_client, "source_provider", type(recommendation_client).__name__),
                    "demand_intelligence_run_id": demand_intelligence.get("id") if demand_intelligence else None,
                    "orchestration_run_id": orchestration.run["id"],
                    "route_plan": [step.model_dump(mode="json") for step in orchestration.route_plan],
                    "agent_results": [
                        result.model_dump(mode="json") for result in orchestration.agent_results
                    ],
                },
            },
        )
        self.repository.update(
            "ad_lp_pairs",
            user_id=user_id,
            filters={"id": pair_id},
            payload={"last_analyzed_at": datetime.now(timezone.utc).isoformat()},
        )
        result["message_match_score"] = message_match_score
        result["orchestration_run_id"] = orchestration.run["id"]
        result["route_plan"] = [step.model_dump(mode="json") for step in orchestration.route_plan]
        return result

    def list_runs(self, *, user_id: str, pair_id: str) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "analysis_runs",
            user_id=user_id,
            filters={"ad_lp_pair_id": pair_id},
            order="created_at.desc",
        )

    def latest_run(self, *, user_id: str, pair_id: str) -> dict[str, Any]:
        runs = self.list_runs(user_id=user_id, pair_id=pair_id)
        if not runs:
            raise ValueError("No analysis runs were found for this pair.")
        return runs[0]

    def _recommend(self, *, ai_mode: str, **payload: Any) -> HistoryAwareRecommendation:
        client = self.openai_llm_client if ai_mode == "openai_only" else self.llm_client
        if client is None:
            raise ValueError("OpenAI client is not configured.")
        response = client.generate_json(
            system_prompt=(
                "Analyze a registered X ad and landing page pair. Return only JSON matching "
                "HistoryAwareRecommendation. Prioritize message mismatch between ad and LP. "
                "Use demand_intelligence only as directional context for pain clusters, desire clusters, "
                "demand signal scores, competitor gaps, root causes, evidence, positioning, feature ideas, "
                "ad appeals, and LP improvement context. Do not make demand verdicts, success predictions, "
                "or revenue forecasts. Every market-related conclusion must remain traceable to evidence_summary. "
                "Low validation_score clusters must not be treated as strong evidence. "
                "Spike or noise trend statuses require cautious wording. "
                "If solution_fit_summary includes unmatched pains, reflect them in ad and LP improvement options. "
                "Use emerging and growing demand signals as next-test hypotheses only. "
                "Use search_demand_summary as search-intent evidence only; never assert exact search volume. "
                "Use market_size_summary as a cautious audience-range estimate, not a market-size verdict. "
                "Prioritize recommendations only when validation, search demand, market size, solution fit, "
                "and positive outcome learning point in the same direction. "
                "When prior outcome learning is negative or search/market evidence is weak, frame the change "
                "as a small test or warning instead of a strong claim. "
                "Use improvement_outcomes as measured history. Check successful, failed, and inconclusive patterns "
                "before recommending a repeated change. Do not claim future success from past outcomes. "
                "Use change history carefully: avoid confident claims when metrics are missing, "
                "treat frequently changed fields as risky, and frame uncertain findings as hypotheses."
                f" Respond in {'Japanese' if payload.get('locale') == 'ja' else 'English'}."
            ),
            user_payload=payload,
            response_model=HistoryAwareRecommendation,
        )
        return TypeAdapter(HistoryAwareRecommendation).validate_python(response)

    @staticmethod
    def _to_ads_collection(ad: dict[str, Any]) -> FullAdsCollection:
        ctr = float(ad.get("ctr") or 0)
        cpc = float(ad.get("cpc") or 0)
        cvr = float(ad.get("cvr") or 0)
        spend = float(ad.get("spend") or 0)
        return FullAdsCollection.model_validate(
            {
                "campaigns": [
                    {
                        "campaign_id": ad["id"],
                        "campaign_name": ad.get("campaign_name") or ad.get("name") or "Registered campaign",
                        "budget": max(spend, 0),
                        "start_date": None,
                        "end_date": None,
                        "status": ad.get("status") or "active",
                    },
                ],
                "ad_groups": [
                    {
                        "targeting": {},
                        "interests": [],
                        "age_range": "unknown",
                        "gender": "unknown",
                        "location": "unknown",
                        "device": "unknown",
                    },
                ],
                "ads": [
                    {
                        "headline": ad.get("headline") or "",
                        "body": ad.get("body") or "",
                        "cta": ad.get("cta") or "",
                        "image": ad.get("image_url"),
                        "video": ad.get("video_url"),
                    },
                ],
                "performance": [
                    {
                        "campaign_id": ad["id"],
                        "impressions": int(ad.get("impressions") or 0),
                        "clicks": int(ad.get("clicks") or 0),
                        "ctr": ctr,
                        "cpc": cpc,
                        "cvr": cvr,
                        "spend": spend,
                        "conversions": int(ad.get("conversions") or 0),
                        "reach": int(ad.get("impressions") or 0),
                        "frequency": 1.0,
                    },
                    {
                        "campaign_id": ad["id"],
                        "impressions": int(ad.get("impressions") or 0),
                        "clicks": int(ad.get("clicks") or 0),
                        "ctr": ctr,
                        "cpc": cpc,
                        "cvr": cvr,
                        "spend": spend,
                        "conversions": int(ad.get("conversions") or 0),
                        "reach": int(ad.get("impressions") or 0),
                        "frequency": 1.0,
                    },
                ],
                "time": [
                    {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "hour": datetime.now(timezone.utc).hour,
                        "weekday": datetime.now(timezone.utc).strftime("%A"),
                    },
                ],
            },
        )

    @staticmethod
    def _to_lp_collection(lp: dict[str, Any]) -> LPCollection:
        buttons = [value for value in [lp.get("primary_cta"), lp.get("secondary_cta")] if value]
        return LPCollection.model_validate(
            {
                "structure": {
                    "hero_title": lp.get("hero_title") or "",
                    "hero_subtitle": lp.get("hero_subtitle") or "",
                    "CTA_count": len(buttons),
                    "buttons": buttons,
                    "FAQ": [],
                },
                "behavior": {
                    "bounce_rate": float(lp.get("bounce_rate") or 0),
                    "session_duration": float(lp.get("session_duration") or 0),
                    "scroll_depth": float(lp.get("scroll_depth") or 0),
                },
                "performance": {
                    "page_speed": float(lp.get("page_speed") or 0),
                    "FCP": float(lp.get("fcp") or 0),
                    "LCP": float(lp.get("lcp") or 0),
                },
            },
        )

    def _message_match_score(self, ad: dict[str, Any], lp: dict[str, Any]) -> int:
        ad_text = " ".join(str(ad.get(key) or "") for key in ["headline", "body", "cta"])
        lp_text = " ".join(
            str(lp.get(key) or "")
            for key in ["hero_title", "hero_subtitle", "primary_cta", "offer_text", "target_audience"]
        )
        return FeatureExtractor._hero_similarity(
            self._to_ads_collection({**ad, "headline": ad_text, "body": "", "cta": ""}),
            self._to_lp_collection({**lp, "hero_title": lp_text, "hero_subtitle": ""}),
        )

    @staticmethod
    def _risk_level(hero_similarity: int, cta_strength: int, lp: dict[str, Any]) -> str:
        bounce_rate = float(lp.get("bounce_rate") or 0)
        if hero_similarity < 25 or bounce_rate >= 80:
            return "high"
        if hero_similarity < 45 or cta_strength < 45 or bounce_rate >= 65:
            return "medium"
        return "low"

    @staticmethod
    def _ad_improvements(recommendation: HistoryAwareRecommendation) -> AdImprovementResult:
        return AdImprovementResult(
            problems=[recommendation.likely_problem or recommendation.overall_diagnosis],
            suggestions=[item.reason for item in recommendation.ad_recommendations] or [recommendation.overall_diagnosis],
            headlines=[item.suggested_value for item in recommendation.ad_recommendations if item.field == "headline"] or ["Keep testing a clearer headline"],
            bodies=[item.suggested_value for item in recommendation.ad_recommendations if item.field == "body"] or ["Align body copy with LP promise"],
            ctas=[item.suggested_value for item in recommendation.ad_recommendations if item.field == "cta"] or ["Use the same action as the LP primary CTA"],
        )

    @staticmethod
    def _lp_improvements(recommendation: HistoryAwareRecommendation) -> LPImprovementResult:
        suggestions = [item.reason for item in recommendation.lp_recommendations] or [recommendation.overall_diagnosis]
        return LPImprovementResult(
            hero=[item.suggested_value for item in recommendation.lp_recommendations if item.field == "hero_title"] or suggestions,
            cta=[item.suggested_value for item in recommendation.lp_recommendations if "cta" in item.field] or suggestions,
            faq=["Add FAQ only after confirming which objections appear in traffic data."],
            structure=suggestions,
            mobile_ui=["Keep first viewport focused on message match, proof, and one CTA."],
        )

    @staticmethod
    def _diff_plan(recommendation: HistoryAwareRecommendation) -> DiffResult:
        changes = [
            {"before": item.current_value, "after": item.suggested_value}
            for item in [*recommendation.ad_recommendations, *recommendation.lp_recommendations]
        ]
        if not changes:
            changes = [{"before": "", "after": recommendation.overall_diagnosis}]
        return DiffResult(files=[{"path": "registered/ad-lp-pair", "changes": changes}])

    @staticmethod
    def _review_result(recommendation: HistoryAwareRecommendation, risk_level: str) -> ReviewResult:
        risky = [item.field for item in [*recommendation.ad_recommendations, *recommendation.lp_recommendations] if item.risk == "high"]
        return ReviewResult(
            exaggerated_claims=[],
            brand_risks=risky,
            ui_risks=[],
            dangerous_changes=[],
            approved_for_pr=risk_level != "high" and not risky,
        )
