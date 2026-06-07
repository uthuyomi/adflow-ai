from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import urlparse

import requests

from backend.core.config import Settings
from backend.core.url_safety import validate_public_http_url
from backend.services.demand.connectors.firecrawl_connector import classify_source_type
from backend.services.demand.demand_models import DemandConnectorRequest, DemandConnectorResponse, DemandRawSignal


class FirecrawlSearchDemandConnector:
    connector_key = "firecrawl_search"
    source_type = "google_search"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def is_configured(self, settings: Settings) -> bool:
        return bool(settings.firecrawl_api_key and settings.firecrawl_search_enabled)

    def collect(self, request: DemandConnectorRequest) -> DemandConnectorResponse:
        if not self.is_configured(self.settings):
            reason = "disabled" if not self.settings.firecrawl_search_enabled else "missing_api_key"
            return DemandConnectorResponse(
                source_type=self.source_type,
                connector_key=self.connector_key,
                status="skipped",
                metadata={"reason": reason},
            )

        queries = list(dict.fromkeys([request.query, *request.expanded_queries]))[
            : self.settings.firecrawl_search_max_queries
        ]
        per_query_limit = min(10, self.settings.firecrawl_search_results_per_query)
        max_results = min(request.max_results, self.settings.firecrawl_search_max_results_per_run)
        signals: list[DemandRawSignal] = []
        errors: list[str] = []
        queries_attempted = 0

        for query in queries:
            try:
                queries_attempted += 1
                response = requests.post(
                    "https://api.firecrawl.dev/v2/search",
                    headers={
                        "Authorization": f"Bearer {self.settings.firecrawl_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "query": query,
                        "limit": min(per_query_limit, max_results - len(signals)),
                        "sources": ["web"],
                        "location": "Japan" if request.language == "ja" else "United States",
                        "timeout": self.settings.firecrawl_timeout_ms,
                    },
                    timeout=max(
                        self.settings.demand_connector_timeout_seconds,
                        self.settings.firecrawl_timeout_ms / 1000 + 5,
                    ),
                )
                response.raise_for_status()
                for item in _web_results(response.json()):
                    url = str(item.get("url") or "").strip()
                    if not url or not _is_public_http_url(url):
                        continue
                    if any(signal.url == url for signal in signals):
                        continue
                    title = str(item.get("title") or url).strip()
                    description = str(item.get("description") or item.get("snippet") or "").strip()
                    signals.append(
                        DemandRawSignal(
                            source_type=classify_source_type(url, title, description),
                            source_name=urlparse(url).netloc or "Firecrawl Search",
                            connector_key=self.connector_key,
                            external_id=url,
                            url=url,
                            title=title,
                            body=description,
                            collected_at=datetime.now(timezone.utc).isoformat(),
                            language=request.language,
                            metadata={
                                "firecrawl_search": True,
                                "search_query": query,
                                "position": item.get("position"),
                                "category": item.get("category"),
                            },
                        ),
                    )
                    if len(signals) >= max_results:
                        break
            except Exception as exc:
                errors.append(f"{query}: {exc}")
            if len(signals) >= max_results:
                break

        status = "completed" if signals and not errors else "partial" if signals else "failed"
        return DemandConnectorResponse(
            source_type=self.source_type,
            connector_key=self.connector_key,
            status=status,
            signals=signals,
            error_message="; ".join(errors) or None,
            metadata={
                "queries_run": queries_attempted,
                "discovered_urls": len(signals),
                "results_per_query": per_query_limit,
                "estimated_search_credits": queries_attempted * 2,
            },
        )


def _web_results(payload: dict) -> list[dict]:
    data = payload.get("data") or {}
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    if isinstance(data, dict):
        return [item for item in (data.get("web") or []) if isinstance(item, dict)]
    return []


def _is_public_http_url(url: str) -> bool:
    try:
        validate_public_http_url(url)
        return True
    except ValueError:
        return False
