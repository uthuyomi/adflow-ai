from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import requests

from backend.core.config import Settings
from backend.services.demand.demand_models import DemandConnectorRequest, DemandConnectorResponse, DemandRawSignal


class YouTubeDemandConnector:
    connector_key = "youtube"
    source_type = "youtube_comment"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def is_configured(self, settings: Settings) -> bool:
        return bool(settings.youtube_api_key)

    def collect(self, request: DemandConnectorRequest) -> DemandConnectorResponse:
        if not self.settings.youtube_api_key:
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="skipped", metadata={"reason": "missing_api_key"})
        try:
            videos = requests.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={"part": "snippet", "q": request.query, "type": "video", "maxResults": 3, "key": self.settings.youtube_api_key, "regionCode": request.region},
                timeout=self.settings.demand_connector_timeout_seconds,
            )
            videos.raise_for_status()
            signals: list[DemandRawSignal] = []
            quota_units = 0
            for item in videos.json().get("items", []):
                video_id = item.get("id", {}).get("videoId")
                title = item.get("snippet", {}).get("title") or "YouTube video"
                if not video_id:
                    continue
                comments = requests.get(
                    "https://www.googleapis.com/youtube/v3/commentThreads",
                    params={"part": "snippet", "videoId": video_id, "maxResults": min(request.max_results, 50), "textFormat": "plainText", "key": self.settings.youtube_api_key},
                    timeout=self.settings.demand_connector_timeout_seconds,
                )
                quota_units += 1
                comments.raise_for_status()
                signals.extend(self._signal(comment, video_id, title) for comment in comments.json().get("items", []))
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="completed", signals=signals, metadata={"quota_units": quota_units})
        except Exception as exc:
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="failed", error_message=str(exc))

    def _signal(self, item: dict[str, Any], video_id: str, video_title: str) -> DemandRawSignal:
        snippet = item.get("snippet", {}).get("topLevelComment", {}).get("snippet", {})
        comment_id = item.get("snippet", {}).get("topLevelComment", {}).get("id") or item.get("id")
        likes = int(snippet.get("likeCount") or 0)
        return DemandRawSignal(
            source_type=self.source_type,
            source_name="YouTube",
            connector_key=self.connector_key,
            external_id=str(comment_id or ""),
            url=f"https://www.youtube.com/watch?v={video_id}",
            title=video_title,
            body=str(snippet.get("textOriginal") or snippet.get("textDisplay") or ""),
            posted_at=snippet.get("publishedAt"),
            collected_at=datetime.now(timezone.utc).isoformat(),
            engagement={"likes": likes, "comments": 0, "shares": 0},
            like_count=likes,
            language="ja",
            metadata={"video_id": video_id, "author": snippet.get("authorDisplayName"), "updated_at": snippet.get("updatedAt")},
        )
