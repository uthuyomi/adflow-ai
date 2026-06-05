from __future__ import annotations

from typing import Any


class SourceQueryBuilder:
    def build(self, *, query: str, pair: dict[str, Any], ad: dict[str, Any] | None = None, lp: dict[str, Any] | None = None) -> dict[str, list[str]]:
        ad = ad or {}
        lp = lp or {}
        base_terms = [
            query,
            ad.get("headline") or "",
            ad.get("body") or "",
            lp.get("hero_title") or "",
            lp.get("offer_text") or "",
            lp.get("target_audience") or "",
        ]
        seed = " ".join(str(term) for term in base_terms if term).strip() or query
        modifiers = ["面倒", "困る", "つらい", "高い", "わからない", "自動化したい", "おすすめ", "比較", "代替", "レビュー", "評判", "使いにくい", "やめた", "乗り換え", "料金", "無料", "安い"]
        ad_ops = ["広告運用 面倒", "広告レポート 自動化", "広告分析 わからない", "広告代理店 レポート つらい", "SNS広告 効果 出ない", "X広告 改善", "Google広告 改善", "LP 改善 わからない", "CVR 改善 難しい"]
        expanded = [f"{seed} {modifier}".strip() for modifier in modifiers[:8]]
        return {
            "x": [*ad_ops[:4], *expanded[:4]],
            "youtube": [*ad_ops[1:5], *expanded[:3]],
            "google_custom_search": [*ad_ops, *expanded],
            "reddit": [query, f"{query} alternative", f"{query} review"],
            "web_page": [value for value in [lp.get("url"), ad.get("destination_url")] if isinstance(value, str) and value.startswith("http")],
            "synthetic": [*ad_ops, *expanded],
        }
