from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.services.supabase.supabase_repository import SupabaseRepository


class AdABTestService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository

    def list_tests(self, *, user_id: str, project_id: str) -> list[dict[str, Any]]:
        tests = self.repository.get_many(
            "ad_ab_tests",
            user_id=user_id,
            filters={"project_id": project_id},
            order="created_at.desc",
        )
        return [self._with_results(user_id=user_id, test=test) for test in tests]

    def create_test(
        self,
        *,
        user_id: str,
        project_id: str,
        name: str,
        hypothesis: str | None,
        primary_metric: str,
        ad_ids: list[str],
    ) -> dict[str, Any]:
        unique_ad_ids = list(dict.fromkeys(ad_ids))
        if len(unique_ad_ids) < 2:
            raise ValueError("Select at least two ads for an A/B test.")
        if primary_metric not in {"ctr", "cvr", "cpc"}:
            raise ValueError("primary_metric must be ctr, cvr, or cpc.")

        ads = self.repository.get_many(
            "twitter_ads",
            user_id=user_id,
            filters={"id": unique_ad_ids, "project_id": project_id},
        )
        if len(ads) != len(unique_ad_ids):
            raise ValueError("Every selected ad must belong to this project.")

        test = self.repository.insert(
            "ad_ab_tests",
            {
                "user_id": user_id,
                "project_id": project_id,
                "name": name,
                "hypothesis": hypothesis,
                "primary_metric": primary_metric,
                "status": "draft",
            },
        )
        for index, ad_id in enumerate(unique_ad_ids):
            self.repository.insert(
                "ad_ab_test_variants",
                {
                    "user_id": user_id,
                    "test_id": test["id"],
                    "twitter_ad_id": ad_id,
                    "label": _variant_label(index),
                },
            )
        return self._with_results(user_id=user_id, test=test)

    def update_status(self, *, user_id: str, test_id: str, status: str) -> dict[str, Any]:
        if status not in {"draft", "running", "completed", "archived"}:
            raise ValueError("Invalid A/B test status.")
        payload: dict[str, Any] = {"status": status}
        now = datetime.now(timezone.utc).isoformat()
        if status == "running":
            payload["started_at"] = now
            payload["ended_at"] = None
        if status == "completed":
            payload["ended_at"] = now
        test = self.repository.update(
            "ad_ab_tests",
            user_id=user_id,
            filters={"id": test_id},
            payload=payload,
        )
        return self._with_results(user_id=user_id, test=test)

    def _with_results(self, *, user_id: str, test: dict[str, Any]) -> dict[str, Any]:
        variants = self.repository.get_many(
            "ad_ab_test_variants",
            user_id=user_id,
            filters={"test_id": test["id"]},
            order="created_at.asc",
        )
        ad_ids = [variant["twitter_ad_id"] for variant in variants]
        ads = self.repository.get_many("twitter_ads", user_id=user_id, filters={"id": ad_ids}) if ad_ids else []
        ads_by_id = {ad["id"]: ad for ad in ads}
        metric = str(test.get("primary_metric") or "ctr")
        variant_results = [
            {
                **variant,
                "ad": ads_by_id.get(variant["twitter_ad_id"]),
                "metric_value": _metric_value(ads_by_id.get(variant["twitter_ad_id"]) or {}, metric),
            }
            for variant in variants
        ]
        eligible = [variant for variant in variant_results if variant["ad"]]
        winner = None
        if eligible:
            winner = min(eligible, key=lambda item: item["metric_value"]) if metric == "cpc" else max(eligible, key=lambda item: item["metric_value"])
        return {
            **test,
            "variants": variant_results,
            "provisional_winner": winner,
            "note": "The winner is directional and based on currently registered metrics; statistical significance is not calculated.",
        }


def _metric_value(ad: dict[str, Any], metric: str) -> float:
    impressions = float(ad.get("impressions") or 0)
    clicks = float(ad.get("clicks") or 0)
    conversions = float(ad.get("conversions") or 0)
    spend = float(ad.get("spend") or 0)
    if metric == "ctr":
        return clicks / impressions * 100 if impressions else float(ad.get("ctr") or 0)
    if metric == "cvr":
        return conversions / clicks * 100 if clicks else float(ad.get("cvr") or 0)
    return spend / clicks if clicks else float(ad.get("cpc") or 0)


def _variant_label(index: int) -> str:
    return chr(ord("A") + index) if index < 26 else f"V{index + 1}"
