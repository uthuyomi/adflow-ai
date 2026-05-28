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
from backend.services.orchestration.ai_orchestrator import AIOrchestrator
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


class HistoryAwareRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    overall_diagnosis: str
    likely_problem: str
    history_based_insights: list[HistoryInsight]
    ad_recommendations: list[FieldRecommendation]
    lp_recommendations: list[FieldRecommendation]
    do_not_change: list[DoNotChangeItem]
    next_test_plan: NextTestPlan


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
        orchestrator: AIOrchestrator | None = None,
    ) -> None:
        self.repository = repository
        self.change_history_service = change_history_service
        self.feature_extractor = feature_extractor
        self.llm_client = llm_client
        self.orchestrator = orchestrator or AIOrchestrator(repository=repository)

    def run(self, *, user_id: str, pair_id: str) -> dict[str, Any]:
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

        ads_collection = self._to_ads_collection(twitter_ad)
        lp_collection = self._to_lp_collection(landing_page)
        features = self.feature_extractor.extract(ads_collection, lp_collection)
        message_match_score = self._message_match_score(twitter_ad, landing_page)
        risk_level = self._risk_level(features.hero_similarity, features.cta_strength, landing_page)
        score = round((features.hero_similarity + features.cta_strength + message_match_score + max(0, 100 - features.bounce_rate)) / 4)
        orchestration = self.orchestrator.run_pair_pipeline(
            user_id=user_id,
            project_id=pair.get("project_id"),
            pair_id=pair_id,
            platform="twitter",
            objective="pair_analysis_with_review_and_diff_readiness",
            context={
                "twitter_ad": twitter_ad,
                "landing_page": landing_page,
                "pair": pair,
                "history": history,
                "previous_runs": previous_runs,
                "features": features.model_dump(mode="json"),
                "message_match_score": message_match_score,
                "risk_level": risk_level,
            },
        )

        recommendation = self._recommend(
            twitter_ad=twitter_ad,
            landing_page=landing_page,
            pair=pair,
            history=history,
            previous_runs=previous_runs,
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
                "ad_improvements": ad_improvements.model_dump(mode="json"),
                "lp_improvements": lp_improvements.model_dump(mode="json"),
                "diff_plan": diff_plan.model_dump(mode="json"),
                "review_result": review_result.model_dump(mode="json"),
                "history_insights": {
                    **recommendation.model_dump(mode="json"),
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

    def _recommend(self, **payload: Any) -> HistoryAwareRecommendation:
        response = self.llm_client.generate_json(
            system_prompt=(
                "Analyze a registered X ad and landing page pair. Return only JSON matching "
                "HistoryAwareRecommendation. Prioritize message mismatch between ad and LP. "
                "Use change history carefully: avoid confident claims when metrics are missing, "
                "treat frequently changed fields as risky, and frame uncertain findings as hypotheses."
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
