from __future__ import annotations

from backend.core.config import Settings
from backend.services.demand.demand_models import DemandConnectorRequest, DemandConnectorResponse


class RedditDemandConnector:
    connector_key = "reddit"
    source_type = "reddit"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def is_configured(self, settings: Settings) -> bool:
        return bool(settings.reddit_client_id and settings.reddit_client_secret and settings.reddit_user_agent)

    def collect(self, request: DemandConnectorRequest) -> DemandConnectorResponse:
        if not self.is_configured(self.settings):
            return DemandConnectorResponse(source_type=self.source_type, connector_key=self.connector_key, status="skipped", metadata={"reason": "missing_api_key"})
        return DemandConnectorResponse(
            source_type=self.source_type,
            connector_key=self.connector_key,
            status="skipped",
            metadata={"reason": "reddit_oauth_search_not_enabled_in_phase_1", "query": request.query},
        )
