from __future__ import annotations

from typing import Any


class MarketSizeLayer:
    def estimate(
        self,
        *,
        clusters: list[dict[str, Any]],
        search_signals: list[dict[str, Any]],
        solution_fits: list[dict[str, Any]],
        competitor_gaps: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        search_by_keyword = {str(signal.get("keyword", "")).lower(): signal for signal in search_signals}
        gap_by_name = {str(gap.get("name", "")).lower(): gap for gap in competitor_gaps}
        estimates = []
        for cluster in clusters[:12]:
            name = str(cluster.get("name") or "Demand segment")
            search_score = self._nearest_search_score(name, search_by_keyword)
            pain_score = float(cluster.get("demand_signal_score") or 0)
            validation_score = float(cluster.get("validation_score") or 0)
            fit_score = self._nearest_fit_score(cluster, solution_fits)
            gap_score = float((gap_by_name.get(name.lower()) or {}).get("gap_score") or 0)
            source_diversity = float(cluster.get("source_diversity") or cluster.get("source_count") or 0)
            persona_spread = len(cluster.get("persona_ratios") or {})
            trend_bonus = 8 if cluster.get("trend_status") in {"growing", "emerging"} else 0
            market_score = max(
                0,
                min(
                    100,
                    search_score * 0.26
                    + pain_score * 0.24
                    + validation_score * 0.18
                    + gap_score * 0.16
                    + min(100, source_diversity * 16) * 0.08
                    + min(100, persona_spread * 20) * 0.04
                    + fit_score * 0.04
                    + trend_bonus,
                ),
            )
            min_size = int(max(100, market_score * 18 + source_diversity * 120))
            max_size = int(min_size * (2.4 if market_score >= 65 else 1.8))
            estimates.append(
                {
                    "cluster_id": cluster.get("db_id") or cluster.get("id"),
                    "segment_name": name,
                    "persona": self._primary_persona(cluster),
                    "estimated_audience_size_min": min_size,
                    "estimated_audience_size_max": max_size,
                    "search_demand_score": round(search_score, 2),
                    "pain_signal_score": round(pain_score, 2),
                    "competitor_gap_score": round(gap_score, 2),
                    "market_size_score": round(market_score, 2),
                    "confidence": round(min(0.88, 0.28 + validation_score / 180 + source_diversity / 25), 3),
                    "assumptions": [
                        "Audience range is an indicative band, not a factual market size assertion.",
                        "Scores combine search demand, pain signals, validation, competitor gaps, and trend context.",
                    ],
                    "evidence": [
                        {"type": "cluster", "name": name, "score": pain_score},
                        {"type": "search_demand", "score": search_score},
                        {"type": "validation", "score": validation_score},
                    ],
                },
            )
        top = sorted(estimates, key=lambda item: item["market_size_score"], reverse=True)
        summary = {
            "market_size_score": round(sum(item["market_size_score"] for item in top[:5]) / max(1, len(top[:5])), 2),
            "promising_segments": [self._segment_summary(item) for item in top[:5] if item["market_size_score"] >= 55],
            "small_market_warnings": [
                f"{item['segment_name']} may be a narrow segment based on current evidence."
                for item in top
                if item["market_size_score"] < 35
            ][:5],
            "persona_market_estimates": [
                {
                    "persona": item["persona"],
                    "segment": item["segment_name"],
                    "range": [item["estimated_audience_size_min"], item["estimated_audience_size_max"]],
                    "confidence": item["confidence"],
                }
                for item in top[:8]
            ],
            "guardrail": "Market size is a cautious estimate band, not a revenue forecast.",
        }
        return estimates, summary

    @staticmethod
    def _nearest_search_score(name: str, search_by_keyword: dict[str, dict[str, Any]]) -> float:
        lower = name.lower()
        best = 0.0
        for keyword, signal in search_by_keyword.items():
            overlap = len(set(lower.split()) & set(keyword.split()))
            if overlap or keyword in lower or lower in keyword:
                best = max(best, float(signal.get("search_demand_score") or 0))
        return best or 30.0

    @staticmethod
    def _nearest_fit_score(cluster: dict[str, Any], solution_fits: list[dict[str, Any]]) -> float:
        cluster_id = cluster.get("db_id") or cluster.get("id")
        for fit in solution_fits:
            if fit.get("cluster_id") == cluster_id:
                return float(fit.get("fit_score") or 0)
        return float(cluster.get("fit_score") or 0)

    @staticmethod
    def _primary_persona(cluster: dict[str, Any]) -> str | None:
        ratios = cluster.get("persona_ratios") or {}
        if not isinstance(ratios, dict) or not ratios:
            return None
        return max(ratios.items(), key=lambda item: float(item[1] or 0))[0]

    @staticmethod
    def _segment_summary(item: dict[str, Any]) -> dict[str, Any]:
        return {
            "segment_name": item["segment_name"],
            "market_size_score": item["market_size_score"],
            "estimated_audience_range": [item["estimated_audience_size_min"], item["estimated_audience_size_max"]],
            "confidence": item["confidence"],
        }
