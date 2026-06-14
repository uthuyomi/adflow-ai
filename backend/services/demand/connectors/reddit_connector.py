from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import requests

from backend.core.config import Settings
from backend.services.demand.demand_models import DemandConnectorRequest, DemandConnectorResponse, DemandRawSignal


class RedditDemandConnector:
    connector_key = "reddit"
    connector_type = "social"
    source_type = "reddit"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def is_configured(self, settings: Settings) -> bool:
        return True

    def collect(self, request: DemandConnectorRequest) -> DemandConnectorResponse:
        try:
            oauth_token = self._oauth_token()
            base_url = "https://oauth.reddit.com" if oauth_token else "https://www.reddit.com"
            headers = {"User-Agent": self.settings.reddit_user_agent}
            if oauth_token:
                headers["Authorization"] = f"Bearer {oauth_token}"
            response = requests.get(
                f"{base_url}/search.json",
                params={"q": request.query, "sort": "relevance", "t": "year", "limit": min(request.max_results, 100), "raw_json": 1},
                headers=headers,
                timeout=self.settings.demand_connector_timeout_seconds,
            )
            response.raise_for_status()
            signals = [self._signal(child.get("data") or {}) for child in response.json().get("data", {}).get("children", [])]
            signals = [signal for signal in signals if signal.external_id and (signal.title or signal.body)]
            return DemandConnectorResponse(
                source_type=self.source_type,
                connector_key=self.connector_key,
                status="completed" if signals else "completed",
                signals=signals,
                metadata={"query": request.query, "result_count": len(signals), "auth_mode": "oauth" if oauth_token else "anonymous"},
            )
        except requests.HTTPError as exc:
            code = exc.response.status_code if exc.response is not None else None
            return DemandConnectorResponse(
                source_type=self.source_type, connector_key=self.connector_key,
                status="unavailable" if code in {401, 403, 429} else "failed",
                error_message=str(exc), metadata={"reason": f"http_{code}" if code else "http_error"},
            )
        except Exception as exc:
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="failed", error_message=str(exc))

    def _oauth_token(self) -> str | None:
        if not (self.settings.reddit_client_id and self.settings.reddit_client_secret):
            return None
        response = requests.post(
            "https://www.reddit.com/api/v1/access_token",
            auth=(self.settings.reddit_client_id, self.settings.reddit_client_secret),
            data={"grant_type": "client_credentials"},
            headers={"User-Agent": self.settings.reddit_user_agent},
            timeout=self.settings.demand_connector_timeout_seconds,
        )
        response.raise_for_status()
        token = response.json().get("access_token")
        if not token:
            raise ValueError("Reddit OAuth response did not contain an access token.")
        return str(token)

    def _signal(self, item: dict[str, Any]) -> DemandRawSignal:
        permalink = str(item.get("permalink") or "")
        created = item.get("created_utc")
        return DemandRawSignal(
            source_type="reddit",
            source_name=f"r/{item.get('subreddit') or 'unknown'}",
            connector_key=self.connector_key,
            external_id=str(item.get("id") or ""),
            url=f"https://www.reddit.com{permalink}" if permalink else None,
            title=str(item.get("title") or ""),
            body=str(item.get("selftext") or item.get("title") or ""),
            posted_at=datetime.fromtimestamp(float(created), tz=timezone.utc).isoformat() if created else None,
            collected_at=datetime.now(timezone.utc).isoformat(),
            engagement={"score": int(item.get("score") or 0), "comments": int(item.get("num_comments") or 0)},
            like_count=int(item.get("score") or 0),
            comment_count=int(item.get("num_comments") or 0),
            language="en",
            metadata={
                "post_id": item.get("id"),
                "subreddit": item.get("subreddit"),
                "author": item.get("author"),
                "upvote_ratio": item.get("upvote_ratio"),
            },
        )
