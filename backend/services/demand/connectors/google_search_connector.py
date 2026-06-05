from __future__ import annotations

from datetime import datetime, timezone

import requests

from backend.core.config import Settings
from backend.services.demand.demand_models import DemandConnectorRequest, DemandConnectorResponse, DemandRawSignal


class GoogleSearchDemandConnector:
    connector_key = "google_custom_search"
    source_type = "google_search"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def is_configured(self, settings: Settings) -> bool:
        return bool(settings.google_custom_search_api_key and settings.google_custom_search_engine_id)

    def collect(self, request: DemandConnectorRequest) -> DemandConnectorResponse:
        if not self.is_configured(self.settings):
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="skipped", metadata={"reason": "missing_api_key"})
        try:
            response = requests.get(
                "https://www.googleapis.com/customsearch/v1",
                params={
                    "key": self.settings.google_custom_search_api_key,
                    "cx": self.settings.google_custom_search_engine_id,
                    "q": request.query,
                    "num": min(request.max_results, 10),
                    "lr": "lang_ja" if request.language == "ja" else None,
                },
                timeout=self.settings.demand_connector_timeout_seconds,
            )
            response.raise_for_status()
            signals = [
                DemandRawSignal(
                    source_type=self.source_type,
                    source_name=item.get("displayLink") or "Google Custom Search",
                    connector_key=self.connector_key,
                    external_id=item.get("cacheId") or item.get("link"),
                    url=item.get("link"),
                    title=item.get("title") or "Search result",
                    body=item.get("snippet") or "",
                    collected_at=datetime.now(timezone.utc).isoformat(),
                    language=request.language,
                    metadata={"displayLink": item.get("displayLink"), "formattedUrl": item.get("formattedUrl")},
                )
                for item in response.json().get("items", [])
            ]
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="completed", signals=signals)
        except Exception as exc:
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="failed", error_message=str(exc))
