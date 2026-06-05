from __future__ import annotations

from collections import Counter
from typing import Any


class SearchDemandLayer:
    def build(
        self,
        *,
        query: str,
        expanded_queries: dict[str, list[str]],
        clusters: list[dict[str, Any]],
        opportunities: list[Any],
        features: list[Any],
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        keywords = self._keywords(query=query, expanded_queries=expanded_queries, clusters=clusters, opportunities=opportunities, features=features)
        signals = [self._signal(query=query, keyword=keyword, index=index) for index, keyword in enumerate(keywords[:20])]
        top = sorted(signals, key=lambda item: item["search_demand_score"], reverse=True)[:8]
        low = [item for item in top if item["search_demand_score"] < 35]
        high = [item for item in top if item["search_demand_score"] >= 65]
        summary = {
            "search_demand_score": round(sum(item["search_demand_score"] for item in top) / max(1, len(top)), 2),
            "top_search_keywords": [
                {
                    "keyword": item["keyword"],
                    "score": item["search_demand_score"],
                    "volume_estimate": item["search_volume_estimate"],
                    "confidence": item["confidence"],
                }
                for item in top
            ],
            "low_search_warning": [
                f"{item['keyword']} has limited observed search demand signals; treat it as a hypothesis."
                for item in low[:4]
            ],
            "high_search_opportunity": [
                f"{item['keyword']} shows relatively stronger search demand signals."
                for item in high[:4]
            ],
            "guardrail": "Search demand is an indicative score, not a demand assertion or revenue forecast.",
        }
        return signals, summary

    def _keywords(
        self,
        *,
        query: str,
        expanded_queries: dict[str, list[str]],
        clusters: list[dict[str, Any]],
        opportunities: list[Any],
        features: list[Any],
    ) -> list[str]:
        raw: list[str] = [query]
        for values in expanded_queries.values():
            raw.extend(values)
        raw.extend(str(cluster.get("name") or "") for cluster in clusters)
        raw.extend(str(getattr(item, "name", "") or "") for item in opportunities)
        raw.extend(str(getattr(item, "feature_name", "") or "") for item in features)
        raw.extend(f"{query} automation")
        raw.extend(f"{query} comparison")
        raw.extend(f"{query} review")
        raw.extend(f"{query} alternative")

        seen: set[str] = set()
        keywords: list[str] = []
        for item in raw:
            keyword = " ".join(str(item).replace("\n", " ").split()).strip()
            if len(keyword) < 2:
                continue
            key = keyword.lower()
            if key in seen:
                continue
            seen.add(key)
            keywords.append(keyword[:120])
        return keywords

    def _signal(self, *, query: str, keyword: str, index: int) -> dict[str, Any]:
        tokens = [token for token in keyword.replace("/", " ").replace("_", " ").split() if token]
        token_score = min(35, len(tokens) * 7)
        intent_score = 0
        lower = keyword.lower()
        for marker in ["automation", "compare", "comparison", "review", "alternative", "tool", "lp", "広告", "自動化", "比較", "レビュー"]:
            if marker in lower:
                intent_score += 8
        related = self._related_keywords(keyword)
        suggest = [f"{keyword} automation", f"{keyword} pricing", f"{keyword} reviews"][:3]
        paa = [f"What problem does {keyword} solve?", f"How to evaluate {keyword}?"]
        score = max(10, min(100, 28 + token_score + intent_score + min(20, len(related) * 3) - index))
        return {
            "query": query,
            "keyword": keyword,
            "source_type": "synthetic_search_demand",
            "search_volume_estimate": int(score * 14 + len(keyword) * 3),
            "competition_level": "high" if score >= 72 else "medium" if score >= 45 else "low",
            "cpc_estimate": round(0.4 + score / 90, 2),
            "related_keywords": related,
            "suggest_queries": suggest,
            "people_also_ask": paa,
            "trend_status": "growing" if score >= 70 else "stable" if score >= 40 else "unknown",
            "confidence": round(min(0.85, 0.35 + score / 160), 3),
            "search_demand_score": score,
            "metadata": {
                "synthetic": True,
                "method": "keyword_intent_related_query_estimate",
                "guardrail": "volume is an estimate, not a factual search volume assertion",
            },
        }

    @staticmethod
    def _related_keywords(keyword: str) -> list[str]:
        words = [word for word, count in Counter(keyword.split()).items() if count >= 1]
        base = " ".join(words[:4]) or keyword
        return [
            f"{base} tool",
            f"{base} workflow",
            f"{base} automation",
            f"{base} alternative",
        ]
