from __future__ import annotations

from datetime import datetime, timezone
import re

from backend.core.config import Settings
from backend.core.url_safety import safe_get_public_url
from backend.services.demand.demand_models import DemandConnectorRequest, DemandConnectorResponse, DemandRawSignal


class WebPageDemandConnector:
    connector_key = "web_page"
    source_type = "competitor_lp"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def is_configured(self, settings: Settings) -> bool:
        return True

    def collect(self, request: DemandConnectorRequest) -> DemandConnectorResponse:
        urls = [value for value in request.expanded_queries if value.startswith("http")][: min(request.max_results, 5)]
        if not urls:
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="skipped", metadata={"reason": "no_urls"})
        signals: list[DemandRawSignal] = []
        errors: list[str] = []
        for url in urls:
            try:
                response = safe_get_public_url(
                    url,
                    timeout=self.settings.demand_connector_timeout_seconds,
                    headers={"User-Agent": "AdFlowAI-DemandBot/0.1"},
                )
                html = response.text[:100_000]
                title = _extract_title(html) or url
                body = _extract_bodyish_text(html)[:4000]
                signals.append(
                    DemandRawSignal(
                        source_type=self.source_type,
                        source_name="Web page",
                        connector_key=self.connector_key,
                        external_id=url,
                        url=url,
                        title=title,
                        body=body,
                        collected_at=datetime.now(timezone.utc).isoformat(),
                        language=request.language,
                        metadata={"content_type": response.headers.get("content-type")},
                    ),
                )
            except Exception as exc:
                errors.append(f"{url}: {exc}")
        status = "completed" if signals and not errors else "partial" if signals else "failed"
        return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status=status, signals=signals, error_message="; ".join(errors) or None)


def _extract_title(html: str) -> str:
    match = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.I | re.S)
    return re.sub(r"\s+", " ", match.group(1)).strip() if match else ""


def _extract_bodyish_text(html: str) -> str:
    text = re.sub(r"<(script|style).*?</\1>", " ", html, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()
