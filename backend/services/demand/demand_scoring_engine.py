from __future__ import annotations

from typing import Any


DEFAULT_WEIGHTS = {
    "search_demand": 0.20,
    "competitor_density": 0.15,
    "review_pain": 0.20,
    "trend_strength": 0.15,
    "social_discussion": 0.20,
    "growth_signal": 0.10,
}


class DemandScoringEngine:
    def score(
        self,
        *,
        user_id: str,
        run_id: str,
        project_id: str | None,
        ad_lp_pair_id: str | None,
        evidence: list[dict[str, Any]],
        competitors: list[dict[str, Any]],
        signals: list[dict[str, Any]],
    ) -> dict[str, Any]:
        search = [row for row in signals if row.get("connector_key") in {"google_custom_search", "firecrawl_search"}]
        reviews = [row for row in signals if row.get("source_type") in {"competitor_review", "review_site", "app_store_review", "google_play_review"}]
        social = [row for row in signals if row.get("source_type") in {"reddit", "x", "forum"}]
        dated = [row for row in signals if row.get("posted_at")]
        components = {
            "search_demand": min(100, len(search) * 8),
            "competitor_density": min(100, len(competitors) * 12),
            "review_pain": min(100, len(reviews) * 15),
            "trend_strength": min(100, len(dated) * 8),
            "social_discussion": min(100, sum(int(row.get("comment_count") or 0) + int(row.get("like_count") or 0) for row in social) / 5),
            "growth_signal": min(100, len([row for row in dated if row.get("posted_at")]) * 6),
        }
        score = round(sum(components[key] * DEFAULT_WEIGHTS[key] for key in DEFAULT_WEIGHTS), 2)
        reasons = [f"{key}: {round(value, 2)} ({round(DEFAULT_WEIGHTS[key] * 100)}% weight)" for key, value in components.items()]
        return {
            "user_id": user_id, "run_id": run_id, "project_id": project_id, "ad_lp_pair_id": ad_lp_pair_id,
            "score": score, **components, "weights": DEFAULT_WEIGHTS, "reasons": reasons,
            "evidence_count": len(evidence), "real_source_count": len({row.get("connector") for row in evidence}),
        }
