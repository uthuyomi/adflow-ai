from __future__ import annotations

from backend.core.config import Settings
from backend.services.demand.connectors.base import BaseDemandConnector
from backend.services.demand.connectors.google_search_connector import GoogleSearchDemandConnector
from backend.services.demand.connectors.reddit_connector import RedditDemandConnector
from backend.services.demand.connectors.synthetic_connector import SyntheticDemandConnector
from backend.services.demand.connectors.web_page_connector import WebPageDemandConnector
from backend.services.demand.connectors.x_connector import XDemandConnector
from backend.services.demand.connectors.youtube_connector import YouTubeDemandConnector


class DemandConnectorRegistry:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.synthetic = SyntheticDemandConnector()
        self.real_connectors: list[BaseDemandConnector] = [
            XDemandConnector(settings),
            YouTubeDemandConnector(settings),
            GoogleSearchDemandConnector(settings),
            RedditDemandConnector(settings),
            WebPageDemandConnector(settings),
        ]

    def selected_connectors(self) -> list[BaseDemandConnector]:
        if not self.settings.demand_real_sources_enabled:
            return [self.synthetic]
        configured = [connector for connector in self.real_connectors if connector.is_configured(self.settings)]
        if self.settings.demand_synthetic_fallback:
            configured.append(self.synthetic)
        return configured or [self.synthetic]

    def skipped_connectors(self) -> list[BaseDemandConnector]:
        if not self.settings.demand_real_sources_enabled:
            return []
        return [connector for connector in self.real_connectors if not connector.is_configured(self.settings)]
