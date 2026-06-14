from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse


REVIEW_HOSTS = ("g2.com", "capterra.com", "producthunt.com", "trustpilot.com", "getapp.com")


class EvidenceEngine:
    def build(self, *, user_id: str, run_id: str, signals: list[dict[str, Any]], query: str) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        terms = {term.lower() for term in query.split() if len(term) > 2}
        for signal in signals:
            url = str(signal.get("url") or "").strip()
            if signal.get("data_source_type") != "REAL" or not url:
                continue
            body = str(signal.get("body") or "").strip()
            text = f"{signal.get('title') or ''} {body}".lower()
            matches = sum(1 for term in terms if term in text)
            relevance = min(100, 35 + matches * 15 + min(int(signal.get("quality_score") or 0), 35))
            rows.append({
                "user_id": user_id,
                "run_id": run_id,
                "signal_id": signal["id"],
                "source_type": signal.get("source_type") or "unknown",
                "source_url": url,
                "connector": signal.get("connector_key") or "unknown",
                "title": signal.get("title") or url,
                "quote": body[:500] or str(signal.get("title") or "")[:500],
                "collected_at": signal.get("collected_at") or datetime.now(timezone.utc).isoformat(),
                "relevance_score": relevance,
                "analysis_reference": "demand_discovery",
                "metadata": {"source_name": signal.get("source_name"), "posted_at": signal.get("posted_at")},
            })
        return rows

    def competitors(self, *, user_id: str, run_id: str, evidence: list[dict[str, Any]]) -> list[dict[str, Any]]:
        by_domain: dict[str, dict[str, Any]] = {}
        for row in evidence:
            domain = (urlparse(row["source_url"]).hostname or "").lower().removeprefix("www.")
            if not domain or domain in {"reddit.com", "x.com", "twitter.com"}:
                continue
            category = "review_platform" if any(host in domain for host in REVIEW_HOSTS) else "competitor_or_market_source"
            current = by_domain.setdefault(domain, {
                "user_id": user_id, "run_id": run_id, "name": domain.split(".")[0].replace("-", " ").title(),
                "domain": domain, "source_url": row["source_url"], "category": category,
                "source_type": row["source_type"], "comparison_data": {"evidence_count": 0, "quotes": []},
                "evidence_ids": [], "collected_at": row["collected_at"],
            })
            current["comparison_data"]["evidence_count"] += 1
            current["comparison_data"]["quotes"].append(row["quote"][:240])
            current["evidence_ids"].append(row.get("id") or row["signal_id"])
        return list(by_domain.values())
