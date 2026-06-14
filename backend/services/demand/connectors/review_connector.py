from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import urlparse

import requests

from backend.core.config import Settings
from backend.services.demand.connectors.firecrawl_search_connector import FirecrawlSearchDemandConnector
from backend.services.demand.demand_models import DemandConnectorRequest, DemandConnectorResponse, DemandRawSignal


REVIEW_SITES = ("g2.com", "capterra.com", "producthunt.com", "getapp.com", "trustpilot.com")


class ReviewDemandConnector:
    connector_key = "review_search"
    connector_type = "review"
    source_type = "competitor_review"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def is_configured(self, settings: Settings) -> bool:
        return bool(
            (settings.google_custom_search_api_key and settings.google_custom_search_engine_id)
            or (settings.firecrawl_api_key and settings.firecrawl_search_enabled)
        )

    def collect(self, request: DemandConnectorRequest) -> DemandConnectorResponse:
        if not self.is_configured(self.settings):
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="skipped", metadata={"reason": "missing_api_key"})
        if not (self.settings.google_custom_search_api_key and self.settings.google_custom_search_engine_id):
            return self._collect_with_firecrawl(request, reason="google_not_configured")
        signals: list[DemandRawSignal] = []
        try:
            query = f"{request.query} reviews ({' OR '.join(f'site:{site}' for site in REVIEW_SITES)})"
            response = requests.get(
                "https://www.googleapis.com/customsearch/v1",
                params={"key": self.settings.google_custom_search_api_key, "cx": self.settings.google_custom_search_engine_id, "q": query, "num": min(10, request.max_results)},
                timeout=self.settings.demand_connector_timeout_seconds,
            )
            response.raise_for_status()
            for item in response.json().get("items", []):
                url = str(item.get("link") or "")
                signals.append(DemandRawSignal(
                    source_type=self.source_type,
                    source_name=urlparse(url).hostname or "Review source",
                    connector_key=self.connector_key,
                    external_id=item.get("cacheId") or url,
                    url=url,
                    title=str(item.get("title") or "Review"),
                    body=str(item.get("snippet") or ""),
                    collected_at=datetime.now(timezone.utc).isoformat(),
                    language=request.language,
                    metadata={"rating": None, "category": "product_review", "search_query": query},
                ))
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="completed", signals=signals, metadata={"query": query})
        except requests.HTTPError as exc:
            code = exc.response.status_code if exc.response is not None else None
            if code in {401, 403, 429} and self.settings.firecrawl_api_key and self.settings.firecrawl_search_enabled:
                return self._collect_with_firecrawl(request, reason=f"google_http_{code}")
            return DemandConnectorResponse(
                source_type=self.source_type, connector_key=self.connector_key,
                status="unavailable" if code in {401, 403, 429} else "failed",
                error_message=str(exc), metadata={"reason": f"http_{code}" if code else "http_error"},
            )
        except Exception as exc:
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="failed", error_message=str(exc))

    def _collect_with_firecrawl(self, request: DemandConnectorRequest, *, reason: str) -> DemandConnectorResponse:
        site_query = f"{request.query} reviews ({' OR '.join(f'site:{site}' for site in REVIEW_SITES)})"
        response = FirecrawlSearchDemandConnector(self.settings).collect(
            request.model_copy(update={"query": site_query, "expanded_queries": []}),
        )
        signals = [
            signal.model_copy(
                update={
                    "source_type": self.source_type,
                    "connector_key": self.connector_key,
                    "metadata": {**signal.metadata, "category": "product_review", "fallback_reason": reason},
                },
            )
            for signal in response.signals
            if any(site in (urlparse(signal.url or "").hostname or "") for site in REVIEW_SITES)
        ]
        status = "completed" if signals else response.status
        return DemandConnectorResponse(
            source_type=self.source_type,
            connector_key=self.connector_key,
            status=status,
            signals=signals,
            error_message=response.error_message if not signals else None,
            metadata={**response.metadata, "provider": "firecrawl_search", "fallback_reason": reason},
        )
