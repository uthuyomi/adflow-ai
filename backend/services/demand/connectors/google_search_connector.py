from __future__ import annotations

from datetime import datetime, timezone

import requests

from backend.core.config import Settings
from backend.services.demand.demand_models import DemandConnectorRequest, DemandConnectorResponse, DemandRawSignal


class GoogleSearchDemandConnector:
    connector_key = "google_custom_search"
    connector_type = "search"
    source_type = "google_search"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def is_configured(self, settings: Settings) -> bool:
        return bool(settings.google_custom_search_api_key and settings.google_custom_search_engine_id)

    def collect(self, request: DemandConnectorRequest) -> DemandConnectorResponse:
        if not self.is_configured(self.settings):
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="skipped", metadata={"reason": "missing_api_key"})
        signals: list[DemandRawSignal] = []
        errors: list[str] = []
        queries = list(dict.fromkeys([request.query, *request.expanded_queries]))[:6]
        for query in queries:
            try:
                response = requests.get(
                    "https://www.googleapis.com/customsearch/v1",
                    params={
                        "key": self.settings.google_custom_search_api_key,
                        "cx": self.settings.google_custom_search_engine_id,
                        "q": query,
                        "num": min(10, max(1, request.max_results - len(signals))),
                        "lr": "lang_ja" if request.language == "ja" else "lang_en",
                    },
                    timeout=self.settings.demand_connector_timeout_seconds,
                )
                response.raise_for_status()
                for item in response.json().get("items", []):
                    link = item.get("link")
                    if link and any(signal.url == link for signal in signals):
                        continue
                    signals.append(
                        DemandRawSignal(
                            source_type=self.source_type,
                            source_name=item.get("displayLink") or "Google Custom Search",
                            connector_key=self.connector_key,
                            external_id=item.get("cacheId") or link,
                            url=link,
                            title=item.get("title") or "Search result",
                            body=item.get("snippet") or "",
                            collected_at=datetime.now(timezone.utc).isoformat(),
                            language=request.language,
                            metadata={
                                "displayLink": item.get("displayLink"),
                                "formattedUrl": item.get("formattedUrl"),
                                "search_query": query,
                            },
                        ),
                    )
                    if len(signals) >= request.max_results:
                        break
            except requests.HTTPError as exc:
                errors.append(f"{query}: {exc}")
                if exc.response is not None and exc.response.status_code in {401, 403, 429}:
                    return DemandConnectorResponse(
                        source_type=self.source_type, connector_key=self.connector_key, status="unavailable",
                        error_message="; ".join(errors), metadata={"reason": f"http_{exc.response.status_code}"},
                    )
            except Exception as exc:
                errors.append(f"{query}: {exc}")
            if len(signals) >= request.max_results:
                break
        status = "completed" if signals and not errors else "partial" if signals else "failed"
        return DemandConnectorResponse(
            source_type=self.source_type,
            connector_key=self.connector_key,
            status=status,
            signals=signals,
            error_message="; ".join(errors) or None,
            metadata={"queries_run": len(queries), "discovered_urls": len([item for item in signals if item.url])},
        )
