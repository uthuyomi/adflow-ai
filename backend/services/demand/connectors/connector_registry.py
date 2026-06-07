from __future__ import annotations

from backend.core.config import Settings
from backend.services.demand.connectors.base import BaseDemandConnector
from backend.services.demand.connectors.firecrawl_connector import FirecrawlDemandConnector
from backend.services.demand.connectors.firecrawl_search_connector import FirecrawlSearchDemandConnector
from backend.services.demand.connectors.google_search_connector import GoogleSearchDemandConnector
from backend.services.demand.connectors.synthetic_connector import SyntheticDemandConnector


class DemandConnectorRegistry:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.synthetic = SyntheticDemandConnector()
        self.google = GoogleSearchDemandConnector(settings)
        self.firecrawl_search = FirecrawlSearchDemandConnector(settings)
        self.firecrawl = FirecrawlDemandConnector(settings)
        self.real_connectors: list[BaseDemandConnector] = [
            self.google,
            self.firecrawl_search,
            self.firecrawl,
        ]

    def selected_connectors(self) -> list[BaseDemandConnector]:
        if not self.settings.demand_real_sources_enabled:
            return [self.synthetic]
        return [connector for connector in self.real_connectors if connector.is_configured(self.settings)]

    def skipped_connectors(self) -> list[BaseDemandConnector]:
        if not self.settings.demand_real_sources_enabled:
            return []
        return [connector for connector in self.real_connectors if not connector.is_configured(self.settings)]
