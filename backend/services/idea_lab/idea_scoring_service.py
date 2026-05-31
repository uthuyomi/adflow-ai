from __future__ import annotations

from typing import Any

from backend.services.idea_lab.models import IdeaOpportunityScore


class IdeaScoringService:
    def score(self, *, profile: dict[str, Any], clusters: list[dict[str, Any]], evidence_count: int) -> IdeaOpportunityScore:
        pain_clusters = [item for item in clusters if item.get("cluster_type") in {"pain", "ux_issue", "onboarding_issue"}]
        competitor_clusters = [item for item in clusters if item.get("cluster_type") == "competitor"]
        pricing_clusters = [item for item in clusters if item.get("cluster_type") == "pricing"]
        need = min(100.0, 45 + evidence_count * 0.8 + len(pain_clusters) * 8)
        pain = min(100.0, 40 + sum(float(item.get("severity_score") or 0) for item in pain_clusters[:5]) / 5)
        competition = max(20.0, min(100.0, 70 - len(competitor_clusters) * 8))
        monetization = 65.0 if profile.get("monetization_model") and "not validated" not in str(profile.get("monetization_model")) else 45.0
        if pricing_clusters:
            monetization += 8
        implementation = {"low": 78.0, "medium": 58.0, "high": 35.0}.get(str(profile.get("estimated_complexity")), 55.0)
        confidence = min(95.0, max(20.0, evidence_count * 1.0 + len(clusters) * 8))
        opportunity = (
            need * 0.25
            + pain * 0.20
            + competition * 0.15
            + monetization * 0.15
            + implementation * 0.15
            + confidence * 0.10
        )
        decision = self._decision(opportunity, confidence, competition, monetization)
        return IdeaOpportunityScore(
            need_score=round(need, 2),
            pain_score=round(pain, 2),
            competition_score=round(competition, 2),
            monetization_score=round(monetization, 2),
            implementation_score=round(implementation, 2),
            confidence_score=round(confidence, 2),
            idea_opportunity_score=round(max(0, min(100, opportunity)), 2),
            decision=decision,
            decision_reason=self._reason(decision, confidence, competition, monetization),
        )

    @staticmethod
    def _decision(score: float, confidence: float, competition: float, monetization: float) -> str:
        if score >= 72 and confidence >= 55 and competition >= 35 and monetization >= 50:
            return "build"
        if score < 42 or competition < 25 or monetization < 35:
            return "avoid"
        return "maybe"

    @staticmethod
    def _reason(decision: str, confidence: float, competition: float, monetization: float) -> str:
        if decision == "build":
            return "Evidence and scoring suggest a strong hypothesis, but this is not a success or demand guarantee."
        if decision == "avoid":
            return "Current evidence suggests weak priority, difficult monetization, or crowded competition."
        if confidence < 55:
            return "Evidence is not strong enough yet; more validation is needed."
        return "The idea has some signals, but tradeoffs remain unclear."
