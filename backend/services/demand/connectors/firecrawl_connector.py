from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import urlparse

import requests

from backend.core.config import Settings
from backend.core.url_safety import validate_public_http_url
from backend.services.demand.demand_models import DemandConnectorRequest, DemandConnectorResponse, DemandRawSignal


class FirecrawlDemandConnector:
    connector_key = "firecrawl"
    source_type = "competitor_lp"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def is_configured(self, settings: Settings) -> bool:
        return bool(settings.firecrawl_api_key)

    def collect(self, request: DemandConnectorRequest) -> DemandConnectorResponse:
        if not self.is_configured(self.settings):
            return DemandConnectorResponse(
                source_type=self.source_type,
                connector_key=self.connector_key,
                status="skipped",
                metadata={"reason": "missing_api_key"},
            )

        urls = sorted([
            url for url in dict.fromkeys(request.expanded_queries) if _is_public_http_url(url)
        ], key=_url_priority)[: self.settings.firecrawl_max_urls_per_run]
        if not urls:
            return DemandConnectorResponse(
                source_type=self.source_type,
                connector_key=self.connector_key,
                status="skipped",
                metadata={"reason": "no_urls"},
            )

        signals: list[DemandRawSignal] = []
        errors: list[str] = []
        for url in urls:
            try:
                response = requests.post(
                    "https://api.firecrawl.dev/v2/scrape",
                    headers={
                        "Authorization": f"Bearer {self.settings.firecrawl_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "url": url,
                        "formats": ["markdown"],
                        "onlyMainContent": True,
                        "maxAge": self.settings.firecrawl_max_age_ms,
                        "timeout": self.settings.firecrawl_timeout_ms,
                    },
                    timeout=max(
                        self.settings.demand_connector_timeout_seconds,
                        self.settings.firecrawl_timeout_ms / 1000 + 5,
                    ),
                )
                response.raise_for_status()
                data = (response.json().get("data") or {})
                metadata = data.get("metadata") or {}
                markdown = (data.get("markdown") or "").strip()
                if not markdown:
                    errors.append(f"{url}: empty content")
                    continue
                source_type = _classify_source_type(url, metadata.get("title") or "", markdown)
                signals.append(
                    DemandRawSignal(
                        source_type=source_type,
                        source_name=metadata.get("sourceURL") or urlparse(url).netloc or "Firecrawl",
                        connector_key=self.connector_key,
                        external_id=metadata.get("sourceURL") or url,
                        url=metadata.get("sourceURL") or url,
                        title=metadata.get("title") or url,
                        body=markdown[:12_000],
                        collected_at=datetime.now(timezone.utc).isoformat(),
                        language=request.language,
                        metadata={
                            "firecrawl": True,
                            "status_code": metadata.get("statusCode"),
                            "description": metadata.get("description"),
                            "content_length": len(markdown),
                        },
                    ),
                )
            except Exception as exc:
                errors.append(f"{url}: {exc}")

        status = "completed" if signals and not errors else "partial" if signals else "failed"
        return DemandConnectorResponse(
            source_type=self.source_type,
            connector_key=self.connector_key,
            status=status,
            signals=signals,
            error_message="; ".join(errors) or None,
            metadata={"requested_urls": len(urls), "scraped_urls": len(signals)},
        )


def _is_public_http_url(url: str) -> bool:
    try:
        validate_public_http_url(url)
        return True
    except ValueError:
        return False


def _classify_source_type(url: str, title: str, body: str) -> str:
    value = f"{url} {title} {body[:1000]}".lower()
    host = (urlparse(url).hostname or "").lower()
    if "reddit.com" in host or "forum" in value or "掲示板" in value:
        return "forum"
    if "x.com" in host or "twitter.com" in host:
        return "x"
    if any(term in value for term in ("review", "reviews", "口コミ", "評判")):
        return "review_site"
    if any(term in value for term in ("compare", "comparison", " vs ", "比較")):
        return "comparison_article"
    return "competitor_lp"


def _url_priority(url: str) -> tuple[int, str]:
    value = url.lower()
    if any(term in value for term in ("review", "reviews", "口コミ", "評判", "comparison", "compare")):
        return (0, value)
    if "reddit.com" in value or "x.com" in value or "twitter.com" in value:
        return (1, value)
    return (2, value)
