from __future__ import annotations

from typing import Any, Protocol, TypeVar

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

TModel = TypeVar("TModel", bound=BaseModel)


class LPStructure(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    hero_title: str
    hero_subtitle: str
    cta_count: int = Field(validation_alias="CTA_count", ge=0)
    buttons: list[str]
    faq: list[str] = Field(validation_alias="FAQ")


class LPBehavior(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bounce_rate: float = Field(ge=0, le=100)
    session_duration: float = Field(ge=0)
    scroll_depth: float = Field(ge=0, le=100)


class LPPerformance(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    page_speed: float = Field(ge=0)
    fcp: float = Field(validation_alias="FCP", ge=0)
    lcp: float = Field(validation_alias="LCP", ge=0)


class LPCollection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    structure: LPStructure
    behavior: LPBehavior
    performance: LPPerformance


class LPDataSource(Protocol):
    def fetch_structure(self) -> dict[str, Any]:
        ...

    def fetch_behavior(self) -> dict[str, Any]:
        ...

    def fetch_performance(self) -> dict[str, Any]:
        ...


class LPCollector:
    def __init__(self, data_source: LPDataSource) -> None:
        self.data_source = data_source

    def collect(self) -> LPCollection:
        return LPCollection(
            structure=self._validate(LPStructure, self.data_source.fetch_structure()),
            behavior=self._validate(LPBehavior, self.data_source.fetch_behavior()),
            performance=self._validate(
                LPPerformance,
                self.data_source.fetch_performance(),
            ),
        )

    @staticmethod
    def _validate(model: type[TModel], payload: dict[str, Any]) -> TModel:
        return TypeAdapter(model).validate_python(payload)
