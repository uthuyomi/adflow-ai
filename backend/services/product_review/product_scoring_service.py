from __future__ import annotations

from typing import Any

from backend.services.product_review.models import ProductOpportunityScore


class ProductScoringService:
    def score(
        self,
        *,
        evidence_count: int,
        clusters: list[dict[str, Any]],
        pair: dict[str, Any] | None,
        product_profile: dict[str, Any] | None,
    ) -> ProductOpportunityScore:
        pain_clusters = [item for item in clusters if item.get("cluster_type") in {"pain", "ux_issue", "pricing"}]
        competitor_clusters = [item for item in clusters if item.get("cluster_type") == "competitor"]
        intent_clusters = [item for item in clusters if item.get("cluster_type") == "intent"]
        evidence_confidence = min(95.0, max(15.0, evidence_count * 0.8))
        pain_score = min(100.0, 45 + sum(float(item.get("severity_score") or 0) for item in pain_clusters[:5]) / 5)
        gap_score = min(100.0, 45 + len(competitor_clusters) * 12 + len(intent_clusters) * 8)
        product_fit_score = 55.0 + (10.0 if product_profile and product_profile.get("core_value") else 0.0)
        message_fit_score = self._message_fit(pair)
        acquisition_fit_score = min(100.0, 50 + len(intent_clusters) * 12 + (10 if pair else 0))
        implementation_cost_risk = max(20.0, 70.0 - len(product_profile.get("current_features") or []) * 3) if product_profile else 60.0
        need_score = min(100.0, (pain_score + gap_score + evidence_confidence) / 3)
        implementation_feasibility = 100 - implementation_cost_risk
        opportunity = (
            need_score * 0.18
            + pain_score * 0.20
            + gap_score * 0.18
            + product_fit_score * 0.16
            + message_fit_score * 0.10
            + acquisition_fit_score * 0.08
            + evidence_confidence * 0.10
            + implementation_feasibility * 0.10
        )
        return ProductOpportunityScore(
            product_opportunity_score=round(max(0, min(100, opportunity)), 2),
            need_score=round(need_score, 2),
            pain_score=round(pain_score, 2),
            gap_score=round(gap_score, 2),
            product_fit_score=round(min(100, product_fit_score), 2),
            message_fit_score=round(message_fit_score, 2),
            acquisition_fit_score=round(acquisition_fit_score, 2),
            evidence_confidence=round(evidence_confidence, 2),
            implementation_cost_risk=round(implementation_cost_risk, 2),
        )

    @staticmethod
    def _message_fit(pair: dict[str, Any] | None) -> float:
        if not pair:
            return 55.0
        ad = pair.get("twitter_ads") or {}
        lp = pair.get("landing_pages") or {}
        ad_terms = set(str(ad.get("headline") or "").lower().split()) | set(str(ad.get("body") or "").lower().split())
        lp_terms = set(str(lp.get("hero_title") or "").lower().split()) | set(str(lp.get("hero_subtitle") or "").lower().split())
        if not ad_terms or not lp_terms:
            return 45.0
        return min(100.0, 45.0 + (len(ad_terms & lp_terms) / max(len(ad_terms), 1)) * 55)
