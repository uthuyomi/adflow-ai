from __future__ import annotations

from collections import Counter
from re import findall

from pydantic import BaseModel, ConfigDict, Field

from backend.services.ads.ad_collector_service import FullAdsCollection
from backend.services.lp.lp_collector import LPCollection


class AIFeatures(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ctr_trend: int
    bounce_rate: int = Field(ge=0, le=100)
    hero_similarity: int = Field(ge=0, le=100)
    cta_strength: int = Field(ge=0, le=100)
    device: str
    weekday: str


class FeatureExtractor:
    def extract(
        self,
        ads_data: FullAdsCollection,
        lp_data: LPCollection,
    ) -> AIFeatures:
        return AIFeatures(
            ctr_trend=self._ctr_trend(ads_data),
            bounce_rate=round(lp_data.behavior.bounce_rate),
            hero_similarity=self._hero_similarity(ads_data, lp_data),
            cta_strength=self._cta_strength(lp_data),
            device=self._most_common_device(ads_data),
            weekday=self._most_common_weekday(ads_data),
        )

    @staticmethod
    def _ctr_trend(ads_data: FullAdsCollection) -> int:
        values = [item.ctr for item in ads_data.performance]
        if len(values) < 2 or values[0] == 0:
            return 0

        return round(((values[-1] - values[0]) / values[0]) * 100)

    @staticmethod
    def _hero_similarity(
        ads_data: FullAdsCollection,
        lp_data: LPCollection,
    ) -> int:
        ad_text = " ".join(
            [creative.headline + " " + creative.body for creative in ads_data.ads],
        )
        hero_text = f"{lp_data.structure.hero_title} {lp_data.structure.hero_subtitle}"
        ad_tokens = set(_tokens(ad_text))
        hero_tokens = set(_tokens(hero_text))
        if not ad_tokens or not hero_tokens:
            return 0

        overlap = len(ad_tokens & hero_tokens)
        union = len(ad_tokens | hero_tokens)
        return round((overlap / union) * 100)

    @staticmethod
    def _cta_strength(lp_data: LPCollection) -> int:
        action_words = {
            "buy",
            "contact",
            "download",
            "free",
            "get",
            "reserve",
            "start",
            "try",
            "購入",
            "相談",
            "無料",
            "開始",
            "予約",
            "資料",
        }
        button_text = " ".join(lp_data.structure.buttons)
        matched_words = len(set(_tokens(button_text)) & action_words)
        count_score = min(lp_data.structure.cta_count * 12, 48)
        word_score = min(matched_words * 18, 36)
        scroll_score = round(lp_data.behavior.scroll_depth * 0.16)
        return min(count_score + word_score + scroll_score, 100)

    @staticmethod
    def _most_common_device(ads_data: FullAdsCollection) -> str:
        devices = [group.device for group in ads_data.ad_groups if group.device]
        if not devices:
            return "unknown"

        return Counter(devices).most_common(1)[0][0]

    @staticmethod
    def _most_common_weekday(ads_data: FullAdsCollection) -> str:
        weekdays = [snapshot.weekday for snapshot in ads_data.time if snapshot.weekday]
        if not weekdays:
            return "unknown"

        return Counter(weekdays).most_common(1)[0][0]


def _tokens(value: str) -> list[str]:
    return findall(r"[A-Za-z0-9_]+|[ぁ-んァ-ン一-龥]+", value.lower())
