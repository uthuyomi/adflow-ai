from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from backend.api import main
from backend.core.config import Settings
from backend.services.demand.lp_report_snapshot_service import LPReportSnapshotService


class FakeDemandService:
    def run(self, **kwargs):
        assert kwargs["research_fingerprint"] == "lp-weekly-snapshot-2026-W24"
        return {"id": "run-1", "created_at": "2026-06-14T00:00:00+00:00", "status": "completed"}


class FakeRepository:
    def __init__(self):
        self.inserted = None

    def get_related_many(self, table, **kwargs):
        if table == "lp_report_snapshots":
            return []
        if table == "demand_intelligence_signals":
            return [
                {"data_source_type": "REAL", "connector_key": "firecrawl_search"},
                {"data_source_type": "REAL", "connector_key": "review_search"},
            ] * 10
        if table == "demand_intelligence_clusters":
            return [{"id": "cluster-1"}]
        raise AssertionError(table)

    def get_real_demand_evidence_for_run(self, **kwargs):
        return [{"id": index} for index in range(20)]

    def get_demand_competitors_for_run(self, **kwargs):
        return [{"id": index} for index in range(12)]

    def get_demand_score_for_run(self, **kwargs):
        return {
            "score": 55,
            "review_pain": 80,
            "social_discussion": 20,
            "trend_strength": 10,
            "search_demand": 90,
        }

    def get_demand_source_runs_for_run(self, **kwargs):
        return [{"source_type": "social", "status": "unavailable", "metadata": {"connector_key": "reddit"}}]

    def insert(self, table, payload):
        assert table == "lp_report_snapshots"
        self.inserted = payload
        return {"id": "snapshot-1", **payload}


def test_weekly_snapshot_builds_persisted_pivot_decision():
    repository = FakeRepository()
    snapshot = LPReportSnapshotService(
        repository=repository,
        demand_service=FakeDemandService(),
    ).refresh(
        user_id="user-1",
        project_id="project-1",
        pair_id="pair-1",
        query="test query",
        now=datetime(2026, 6, 14, tzinfo=timezone.utc),
    )

    assert snapshot["recommendation"] == "PIVOT"
    assert snapshot["confidence"] == "Medium"
    assert snapshot["opportunity"] == "Medium"
    assert snapshot["next_action"].startswith("Launch a focused landing page")
    assert snapshot["source_statuses"][0]["source"] == "reddit"
    assert "error" not in snapshot["source_statuses"][0]
    assert len(snapshot["reasons"]) == 3


def test_weekly_snapshot_internal_endpoint_rejects_invalid_secret(monkeypatch):
    monkeypatch.setattr(
        main,
        "load_settings",
        lambda: Settings(lp_snapshot_cron_secret="expected-secret"),
    )

    with pytest.raises(HTTPException) as exc:
        main.refresh_lp_report_snapshot(x_cron_secret="wrong-secret")

    assert exc.value.status_code == 401
