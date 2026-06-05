from __future__ import annotations

from datetime import date
from typing import Any


class DemandMonitoringEngine:
    def snapshot(
        self,
        *,
        clusters: list[dict[str, Any]],
        validations: list[dict[str, Any]],
        solution_fits: list[dict[str, Any]],
        previous_snapshots: list[dict[str, Any]] | None = None,
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        previous_snapshots = previous_snapshots or []
        validation_by_cluster = {item.get("cluster_id") or item.get("cluster_key"): item for item in validations}
        fit_by_cluster: dict[str, list[dict[str, Any]]] = {}
        for fit in solution_fits:
            fit_by_cluster.setdefault(str(fit.get("cluster_id")), []).append(fit)
        snapshots: list[dict[str, Any]] = []
        for cluster in clusters:
            cluster_id = cluster.get("db_id") or cluster.get("id")
            validation = validation_by_cluster.get(cluster_id) or validation_by_cluster.get(cluster.get("id")) or {}
            fit_values = [float(item.get("fit_score") or 0) for item in fit_by_cluster.get(str(cluster_id), [])]
            validation_score = float(validation.get("validation_score") or cluster.get("validation_score") or 0)
            fit_score = sum(fit_values) / len(fit_values) if fit_values else None
            growth_30d = _growth(cluster, previous_snapshots, days=30)
            trend_status = _trend_status(cluster=cluster, validation=validation, growth_30d=growth_30d)
            snapshots.append(
                {
                    "cluster_id": cluster_id,
                    "cluster_name": cluster.get("name"),
                    "cluster_type": cluster.get("cluster_type"),
                    "category": cluster.get("category"),
                    "snapshot_date": date.today().isoformat(),
                    "signal_count": int(cluster.get("count") or 0),
                    "source_count": int(cluster.get("source_count") or 0),
                    "demand_signal_score": float(cluster.get("demand_signal_score") or 0),
                    "validation_score": validation_score,
                    "fit_score": fit_score,
                    "growth_7d": _growth(cluster, previous_snapshots, days=7),
                    "growth_30d": growth_30d,
                    "growth_90d": _growth(cluster, previous_snapshots, days=90),
                    "trend_status": trend_status,
                    "metadata": {"evidence_quality_score": cluster.get("evidence_quality_score")},
                },
            )
        summary = {
            "emerging_clusters": [item for item in snapshots if item["trend_status"] == "emerging"],
            "growing_clusters": [item for item in snapshots if item["trend_status"] == "growing"],
            "stable_clusters": [item for item in snapshots if item["trend_status"] == "stable"],
            "declining_clusters": [item for item in snapshots if item["trend_status"] == "declining"],
            "spike_warnings": [item for item in snapshots if item["trend_status"] == "spike"],
            "noise_warnings": [item for item in snapshots if item["trend_status"] == "noise"],
            "top_growth_signals": sorted(snapshots, key=lambda item: item.get("growth_30d") or 0, reverse=True)[:8],
        }
        return snapshots, summary


def _growth(cluster: dict[str, Any], previous: list[dict[str, Any]], *, days: int) -> float | None:
    same = [item for item in previous if item.get("cluster_name") == cluster.get("name")]
    if not same:
        return None
    baseline = float(same[0].get("signal_count") or 0)
    current = float(cluster.get("count") or 0)
    if baseline <= 0:
        return None
    return round((current - baseline) / baseline, 4)


def _trend_status(*, cluster: dict[str, Any], validation: dict[str, Any], growth_30d: float | None) -> str:
    validation_score = float(validation.get("validation_score") or 0)
    noise_ratio = float(validation.get("noise_ratio") or cluster.get("noise_ratio") or 0)
    continuity = float(validation.get("continuity_score") or 0)
    if validation_score < 35 or noise_ratio >= 0.55:
        return "noise"
    if growth_30d is None and int(cluster.get("count") or 0) >= 40 and validation_score >= 60:
        return "emerging"
    if growth_30d is not None and growth_30d >= 0.25 and continuity < 8:
        return "spike"
    if growth_30d is not None and growth_30d >= 0.12:
        return "growing"
    if growth_30d is not None and growth_30d <= -0.12:
        return "declining"
    return "stable"
