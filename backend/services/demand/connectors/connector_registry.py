from __future__ import annotations

from backend.core.config import Settings
from backend.services.demand.connectors.base import BaseDemandConnector
from backend.services.demand.connectors.firecrawl_connector import FirecrawlDemandConnector
from backend.services.demand.connectors.firecrawl_search_connector import FirecrawlSearchDemandConnector
from backend.services.demand.connectors.google_search_connector import GoogleSearchDemandConnector
from backend.services.demand.connectors.reddit_connector import RedditDemandConnector
from backend.services.demand.connectors.review_connector import ReviewDemandConnector
from backend.services.demand.connectors.synthetic_connector import SyntheticDemandConnector
from backend.services.demand.connectors.web_page_connector import WebPageDemandConnector
from backend.services.demand.connectors.x_connector import XDemandConnector


class DemandConnectorRegistry:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.synthetic = SyntheticDemandConnector()
        self.google = GoogleSearchDemandConnector(settings)
        self.firecrawl_search = FirecrawlSearchDemandConnector(settings)
        self.firecrawl = FirecrawlDemandConnector(settings)
        self.reddit = RedditDemandConnector(settings)
        self.review = ReviewDemandConnector(settings)
        self.x = XDemandConnector(settings)
        self.web_page = WebPageDemandConnector(settings)
        self.real_connectors: list[BaseDemandConnector] = [
            self.google,
            self.firecrawl_search,
            self.reddit,
            self.review,
            self.x,
            self.web_page,
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
