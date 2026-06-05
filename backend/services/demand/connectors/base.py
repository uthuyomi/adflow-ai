from __future__ import annotations

from typing import Protocol

from backend.core.config import Settings
from backend.services.demand.demand_models import DemandConnectorRequest, DemandConnectorResponse


class BaseDemandConnector(Protocol):
    connector_key: str
    source_type: str

    def is_configured(self, settings: Settings) -> bool:
        ...

    def collect(self, request: DemandConnectorRequest) -> DemandConnectorResponse:
        ...
