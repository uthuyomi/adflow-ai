from __future__ import annotations

import re
from collections import Counter, defaultdict
from typing import Any

from backend.services.evidence.models import EvidenceCluster

KEYWORDS_BY_TYPE = {
    "pain": ("friction", "hard", "problem", "complaint", "cannot", "slow", "manual"),
    "feature_request": ("want", "wish", "request", "support", "template", "import"),
    "pricing": ("price", "pricing", "expensive", "plan", "free", "cost"),
    "competitor": ("competitor", "alternative", "peer", "versus"),
    "intent": ("search", "compare", "intent", "keyword", "query"),
    "lp_gap": ("cta", "lp", "hero", "promise", "message"),
    "retention_issue": ("retention", "churn", "cancel", "return"),
    "activation_issue": ("activation", "first value", "signup", "trial"),
    "onboarding_issue": ("onboarding", "setup", "tutorial", "guide"),
    "technical_issue": ("bug", "error", "crash", "performance", "api"),
    "objection": ("concern", "risk", "unclear", "trust"),
}


class EvidenceClusteringService:
    def cluster(self, sources: list[dict[str, Any]], embeddings: list[list[float]] | None = None) -> list[EvidenceCluster]:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for source in sources:
            grouped[self._cluster_type(source)].append(source)

        clusters: list[EvidenceCluster] = []
        for cluster_type, items in grouped.items():
            keywords = self._keywords(items)
            count = len(items)
            score = min(95, 45 + count * 8)
            clusters.append(
                EvidenceCluster(
                    project_id=items[0].get("project_id"),
                    ad_lp_pair_id=items[0].get("ad_lp_pair_id"),
                    market_research_run_id=items[0].get("market_research_run_id"),
                    product_review_run_id=items[0].get("product_review_run_id"),
                    monitoring_run_id=items[0].get("monitoring_run_id"),
                    idea_session_id=items[0].get("idea_session_id"),
                    cluster_type=cluster_type,
                    label=self._label(cluster_type, keywords),
                    description=self._description(cluster_type, items, keywords),
                    evidence_count=count,
                    severity_score=score if cluster_type in {"pain", "ux_issue", "pricing"} else max(40, score - 10),
                    frequency_score=min(100, 35 + count * 10),
                    urgency_score=min(100, 40 + count * 7),
                    opportunity_score=min(100, 50 + count * 7),
                    trend_score=min(100, 30 + count * 9),
                    confidence=round(min(0.9, 0.35 + count * 0.08), 2),
                    representative_evidence_ids=[str(item.get("id")) for item in items[:5] if item.get("id")],
                    keywords=keywords,
                    metadata={"phase": "fallback_cluster", "embedding_used": bool(embeddings)},
                ),
            )
        return sorted(clusters, key=lambda item: item.evidence_count, reverse=True)

    @staticmethod
    def _cluster_type(source: dict[str, Any]) -> str:
        text = f"{source.get('title') or ''} {source.get('normalized_content') or source.get('raw_content') or ''}".lower()
        for cluster_type, keywords in KEYWORDS_BY_TYPE.items():
            if any(keyword in text for keyword in keywords):
                return cluster_type
        if source.get("source_type") == "competitor":
            return "competitor"
        if source.get("source_type") == "search":
            return "intent"
        if source.get("source_type") == "github":
            return "technical_issue"
        return "pain" if source.get("sentiment") == "negative" else "ad_angle"

    @staticmethod
    def _keywords(items: list[dict[str, Any]]) -> list[str]:
        words: Counter[str] = Counter()
        stop = {"the", "and", "for", "that", "with", "this", "query", "context", "sample"}
        for item in items:
            text = str(item.get("normalized_content") or item.get("raw_content") or "").lower()
            for word in re.split(r"\W+", text):
                if len(word) >= 4 and word not in stop:
                    words[word] += 1
        return [word for word, _ in words.most_common(8)]

    @staticmethod
    def _label(cluster_type: str, keywords: list[str]) -> str:
        labels = {
            "pain": "Repeated user pain",
            "ux_issue": "UX friction",
            "feature_request": "Feature request signals",
            "pricing": "Pricing and packaging concern",
            "competitor": "Competitor positioning gap",
            "intent": "Search intent cluster",
            "lp_gap": "Ad and LP message gap",
            "ad_angle": "Ad angle evidence",
            "retention_issue": "Retention issue",
            "activation_issue": "Activation issue",
            "onboarding_issue": "Onboarding issue",
            "technical_issue": "Technical issue",
            "objection": "Objection cluster",
        }
        suffix = f": {', '.join(keywords[:3])}" if keywords else ""
        return f"{labels.get(cluster_type, cluster_type)}{suffix}"

    @staticmethod
    def _description(cluster_type: str, items: list[dict[str, Any]], keywords: list[str]) -> str:
        return (
            f"{len(items)} evidence items were grouped as {cluster_type}. "
            "Use this as directional context; it is not proof of demand or success. "
            f"Top terms: {', '.join(keywords[:5]) or 'none'}."
        )
