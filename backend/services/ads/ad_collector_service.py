from __future__ import annotations

from datetime import date, datetime
from typing import Any, Protocol, TypeVar

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, TypeAdapter

TModel = TypeVar("TModel", bound=BaseModel)


class Campaign(BaseModel):
    model_config = ConfigDict(extra="forbid")

    campaign_id: str
    campaign_name: str
    budget: float
    start_date: date | None = None
    end_date: date | None = None
    status: str


class AdGroup(BaseModel):
    model_config = ConfigDict(extra="forbid")

    targeting: dict[str, Any]
    interests: list[str]
    age_range: str
    gender: str
    location: str
    device: str


class AdCreative(BaseModel):
    model_config = ConfigDict(extra="forbid")

    headline: str
    body: str
    cta: str = Field(validation_alias=AliasChoices("CTA", "cta"))
    image: str | None = None
    video: str | None = None


class AdMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid")

    campaign_id: str
    impressions: int
    clicks: int
    ctr: float
    cpc: float
    cvr: float
    spend: float


class Performance(AdMetrics):
    model_config = ConfigDict(extra="forbid")

    conversions: int
    reach: int
    frequency: float


class TimeSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    timestamp: datetime
    hour: int = Field(ge=0, le=23)
    weekday: str


class FullAdsCollection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    campaigns: list[Campaign]
    ad_groups: list[AdGroup]
    ads: list[AdCreative]
    performance: list[Performance]
    time: list[TimeSnapshot]


class AdsDataSource(Protocol):
    def fetch_campaigns(self) -> list[dict[str, Any]]:
        ...

    def fetch_ad_groups(self) -> list[dict[str, Any]]:
        ...

    def fetch_ads(self) -> list[dict[str, Any]]:
        ...

    def fetch_performance(self) -> list[dict[str, Any]]:
        ...

    def fetch_time_snapshots(self) -> list[dict[str, Any]]:
        ...


class AdCollectorService:
    def __init__(self, data_source: AdsDataSource) -> None:
        self.data_source = data_source

    def collect(self) -> FullAdsCollection:
        return FullAdsCollection(
            campaigns=self._validate_list(Campaign, self.data_source.fetch_campaigns()),
            ad_groups=self._validate_list(AdGroup, self.data_source.fetch_ad_groups()),
            ads=self._validate_list(AdCreative, self.data_source.fetch_ads()),
            performance=self._validate_list(
                Performance,
                self.data_source.fetch_performance(),
            ),
            time=self._validate_list(
                TimeSnapshot,
                self.data_source.fetch_time_snapshots(),
            ),
        )

    @staticmethod
    def _validate_list(
        model: type[TModel],
        payload: list[dict[str, Any]],
    ) -> list[TModel]:
        return TypeAdapter(list[model]).validate_python(payload)
