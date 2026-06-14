from __future__ import annotations

from typing import Any, Protocol

from backend.services.supabase.supabase_repository import SupabaseRepository


class OutcomeMetricConnector(Protocol):
    key: str

    def collect(self, *, user_id: str, outcome: dict[str, Any]) -> dict[str, Any]:
        ...


class XAdsOutcomeConnector:
    key = "X_ADS"

    def __init__(self, repository: SupabaseRepository) -> None:
        self.repository = repository

    def collect(self, *, user_id: str, outcome: dict[str, Any]) -> dict[str, Any]:
        requests = self.repository.get_many("x_ads_publish_requests", user_id=user_id, filters={"outcome_id": outcome["id"]}, limit=1)
        if not requests or not requests[0].get("created_ad_id"):
            raise ValueError("No X Ads published ad is linked to this outcome.")
        snapshots = self.repository.get_many("x_ads_metric_snapshots", user_id=user_id, filters={"twitter_ad_id": requests[0]["created_ad_id"]}, order="snapshot_date.asc", limit=500)
        if not snapshots:
            raise ValueError("No X Ads metric snapshots are linked to this outcome.")
        before = outcome.get("before_metrics") or _snapshot_metrics(snapshots[0])
        after = _snapshot_metrics(snapshots[-1])
        return {
            "before_metrics": before,
            "after_metrics": after,
            "measurement_method": "X Ads metric snapshots",
            "measurement_source": self.key,
            "evidence_data": [{"snapshot_id": row["id"], "snapshot_date": row.get("snapshot_date")} for row in snapshots],
        }


class OutcomeConnectorRegistry:
    def __init__(self, repository: SupabaseRepository) -> None:
        self.connectors: dict[str, OutcomeMetricConnector] = {"X_ADS": XAdsOutcomeConnector(repository)}

    def collect(self, *, key: str, user_id: str, outcome: dict[str, Any]) -> dict[str, Any]:
        connector = self.connectors.get(key.upper())
        if connector is None:
            raise ValueError(f"Outcome connector is not configured: {key}")
        return connector.collect(user_id=user_id, outcome=outcome)

    def available(self) -> list[str]:
        return sorted(self.connectors)


def _snapshot_metrics(snapshot: dict[str, Any]) -> dict[str, Any]:
    metrics = {key: snapshot.get(key) or 0 for key in ("impressions", "clicks", "conversions", "spend")}
    impressions, clicks, conversions, spend = float(metrics["impressions"]), float(metrics["clicks"]), float(metrics["conversions"]), float(metrics["spend"])
    return {
        **metrics,
        "ctr": clicks / impressions if impressions else 0,
        "cvr": conversions / clicks if clicks else 0,
        "cpc": spend / clicks if clicks else 0,
        "cpa": spend / conversions if conversions else 0,
    }
