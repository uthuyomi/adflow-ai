from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import requests

from backend.core.config import Settings
from backend.services.demand.demand_models import DemandConnectorRequest, DemandConnectorResponse, DemandRawSignal


class XDemandConnector:
    connector_key = "x"
    source_type = "x"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def is_configured(self, settings: Settings) -> bool:
        return bool(settings.x_api_bearer_token)

    def collect(self, request: DemandConnectorRequest) -> DemandConnectorResponse:
        if not self.settings.x_api_bearer_token:
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="skipped", metadata={"reason": "missing_api_key"})
        try:
            query = (request.expanded_queries[0] if request.expanded_queries else request.query) + " lang:ja"
            response = requests.get(
                "https://api.twitter.com/2/tweets/search/recent",
                params={
                    "query": query,
                    "max_results": min(max(request.max_results, 10), 100),
                    "tweet.fields": "created_at,public_metrics,author_id,lang",
                },
                headers={"Authorization": f"Bearer {self.settings.x_api_bearer_token}"},
                timeout=self.settings.demand_connector_timeout_seconds,
            )
            response.raise_for_status()
            payload = response.json()
            signals = [self._signal(item) for item in payload.get("data", [])]
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="completed", signals=signals, metadata={"query": query})
        except Exception as exc:
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="failed", error_message=str(exc))

    def _signal(self, item: dict[str, Any]) -> DemandRawSignal:
        metrics = item.get("public_metrics") or {}
        likes = int(metrics.get("like_count") or 0)
        replies = int(metrics.get("reply_count") or 0)
        reposts = int(metrics.get("retweet_count") or 0)
        quotes = int(metrics.get("quote_count") or 0)
        return DemandRawSignal(
            source_type="x",
            source_name="X",
            connector_key=self.connector_key,
            external_id=str(item.get("id") or ""),
            url=f"https://x.com/i/web/status/{item.get('id')}",
            title="X post",
            body=str(item.get("text") or ""),
            posted_at=item.get("created_at"),
            collected_at=datetime.now(timezone.utc).isoformat(),
            engagement={"likes": likes, "comments": replies, "shares": reposts + quotes},
            like_count=likes,
            comment_count=replies,
            share_count=reposts + quotes,
            language=str(item.get("lang") or "ja"),
            metadata={"author_id": item.get("author_id"), "public_metrics": metrics},
        )
