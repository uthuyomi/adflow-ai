from __future__ import annotations

from typing import Any


class SourceQueryBuilder:
    def build(
        self,
        *,
        query: str,
        pair: dict[str, Any] | None = None,
        ad: dict[str, Any] | None = None,
        lp: dict[str, Any] | None = None,
        source_urls: list[str] | None = None,
        locale: str = "ja",
    ) -> dict[str, list[str]]:
        pair = pair or {}
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
        unique_terms = list(dict.fromkeys(str(term).strip() for term in base_terms if str(term).strip()))
        seed = " ".join(unique_terms).strip()[:300] or query
        modifiers = (
            ["不満", "困る", "高い", "分かりにくい", "比較", "代替", "レビュー", "評判", "よくある質問"]
            if locale == "ja"
            else ["complaints", "problems", "too expensive", "difficult to use", "comparison", "alternative", "reviews", "switching", "frequently asked questions"]
        )
        expanded = [f"{seed} {modifier}".strip() for modifier in modifiers]
        auxiliary = (
            [f"site:reddit.com {seed} 不満 OR レビュー OR 代替", f"site:x.com {seed} 不満 OR 困る OR 欲しい"]
            if locale == "ja"
            else [f"site:reddit.com {seed} problem OR review OR alternative", f"site:x.com {seed} complaint OR difficult OR wish"]
        )
        urls = [
            value
            for value in [*(source_urls or []), lp.get("url"), ad.get("destination_url")]
            if isinstance(value, str) and value.startswith(("http://", "https://"))
        ]
        return {
            "google_custom_search": [query, *auxiliary, *expanded],
            "firecrawl": list(dict.fromkeys(urls)),
            "synthetic": expanded,
        }
