from __future__ import annotations

from copy import deepcopy

import pytest

from backend.services.product.ad_ab_test_service import AdABTestService


class FakeRepository:
    def __init__(self) -> None:
        self.rows = {
            "ad_projects": [{"id": "p1", "user_id": "u1"}],
            "twitter_ads": [{"id": "a1", "user_id": "u1", "project_id": "p1"}, {"id": "a2", "user_id": "u1", "project_id": "p1"}],
            "ad_ab_tests": [], "ad_ab_test_variants": [], "experiment_status_history": [],
            "lp_analytics_events": [], "x_ads_metric_snapshots": [], "experiment_measurements": [],
            "experiment_evaluations": [], "experiment_learning_data": [], "revenue_impacts": [],
            "experiment_insights": [], "user_notifications": [],
        }

    def get_many(self, table, *, user_id, filters=None, order=None, limit=None, **_):
        def matches(row, key, value):
            return row.get(key) in value if isinstance(value, list) else row.get(key) == value
        rows = [deepcopy(row) for row in self.rows[table] if row.get("user_id") == user_id and all(matches(row, key, value) for key, value in (filters or {}).items())]
        return rows[:limit] if limit else rows

    def get_one(self, table, *, user_id, filters, **_):
        rows = self.get_many(table, user_id=user_id, filters=filters, limit=1)
        if not rows:
            raise ValueError(f"{table} record was not found.")
        return rows[0]

    def get_related_many(self, table, *, filters, order=None, limit=None, **_):
        rows = [deepcopy(row) for row in self.rows[table] if all(row.get(key) == value for key, value in filters.items())]
        return rows[:limit] if limit else rows

    def insert(self, table, payload):
        row = {"id": f"{table}-{len(self.rows[table]) + 1}", "created_at": "2026-06-15T00:00:00+00:00", **deepcopy(payload)}
        self.rows[table].append(row)
        if table == "ad_ab_tests":
            self.rows["experiment_status_history"].append({"id": "h1", "user_id": row["user_id"], "experiment_id": row["id"], "old_status": None, "new_status": row["status"], "reason": "created"})
        return deepcopy(row)

    def update(self, table, *, user_id, filters, payload):
        row = next(row for row in self.rows[table] if row.get("user_id") == user_id and all(row.get(key) == value for key, value in filters.items()))
        old = row.get("status")
        row.update(deepcopy(payload))
        if table == "ad_ab_tests" and old != row.get("status"):
            self.rows["experiment_status_history"].append({"id": f"h{len(self.rows['experiment_status_history']) + 1}", "user_id": user_id, "experiment_id": row["id"], "old_status": old, "new_status": row["status"], "reason": payload.get("failure_reason")})
        return deepcopy(row)

    def delete(self, table, *, user_id, filters):
        self.rows[table] = [row for row in self.rows[table] if not (row.get("user_id") == user_id and all(row.get(key) == value for key, value in filters.items()))]

    def rpc(self, name, payload):
        return {"active_experiments": 1}


def create_running(service: AdABTestService):
    test = service.create_test(user_id="u1", project_id="p1", name="CTA test", hypothesis="B wins", primary_metric="cvr", ad_ids=["a1", "a2"], minimum_sample_size=100, confidence_threshold=0.95)
    service.update_status(user_id="u1", test_id=test["id"], status="READY")
    return service.update_status(user_id="u1", test_id=test["id"], status="RUNNING")


def test_state_transitions_and_invalid_transition() -> None:
    service = AdABTestService(repository=FakeRepository())  # type: ignore[arg-type]
    test = service.create_test(user_id="u1", project_id="p1", name="CTA test", hypothesis=None, primary_metric="cvr", ad_ids=["a1", "a2"])
    with pytest.raises(ValueError, match="Invalid experiment"):
        service.update_status(user_id="u1", test_id=test["id"], status="COMPLETED")
    ready = service.update_status(user_id="u1", test_id=test["id"], status="READY")
    assert ready["status"] == "READY"
    assert len(ready["history"]) == 2


def test_insufficient_data_does_not_invent_winner() -> None:
    repo = FakeRepository()
    service = AdABTestService(repository=repo)  # type: ignore[arg-type]
    test = create_running(service)
    evaluated = service.evaluate(user_id="u1", test_id=test["id"])
    assert evaluated["latest_evaluation"]["status"] == "INSUFFICIENT_DATA"
    assert evaluated["latest_evaluation"]["winner_variant_id"] is None
    assert not repo.rows["experiment_learning_data"]


def test_real_lp_events_create_winner_learning_revenue_and_alert() -> None:
    repo = FakeRepository()
    service = AdABTestService(repository=repo)  # type: ignore[arg-type]
    test = create_running(service)
    variants = test["variants"]
    for variant, conversions in ((variants[0], 10), (variants[1], 40)):
        for index in range(200):
            service.ingest_lp_event(user_id="u1", payload={"experiment_id": test["id"], "variant_id": variant["id"], "session_id": f"{variant['id']}-{index}", "event_name": "PAGE_VIEW", "idempotency_key": f"view-{variant['id']}-{index}"})
        for index in range(conversions):
            service.ingest_lp_event(user_id="u1", payload={"experiment_id": test["id"], "variant_id": variant["id"], "session_id": f"{variant['id']}-{index}", "event_name": "FORM_SUBMIT", "idempotency_key": f"submit-{variant['id']}-{index}", "revenue": 100})
    repo.rows["ad_ab_tests"][0]["primary_metric"] = "form_submit_rate"
    evaluated = service.evaluate(user_id="u1", test_id=test["id"], complete=True)
    assert evaluated["latest_evaluation"]["status"] == "WINNER_FOUND"
    assert evaluated["status"] == "COMPLETED"
    assert len(repo.rows["experiment_learning_data"]) == 1
    assert len(repo.rows["revenue_impacts"]) == 1
    assert len(repo.rows["user_notifications"]) == 1


def test_duplicate_lp_event_is_rejected_by_storage_contract() -> None:
    repo = FakeRepository()
    service = AdABTestService(repository=repo)  # type: ignore[arg-type]
    test = create_running(service)
    payload = {"experiment_id": test["id"], "variant_id": test["variants"][0]["id"], "session_id": "s1", "event_name": "PAGE_VIEW", "idempotency_key": "same-key"}
    service.ingest_lp_event(user_id="u1", payload=payload)
    assert len(repo.rows["lp_analytics_events"]) == 1


def test_traffic_assignment_is_stable_for_session() -> None:
    repo = FakeRepository()
    service = AdABTestService(repository=repo)  # type: ignore[arg-type]
    test = create_running(service)
    first = service.assign_variant(tracking_token=test["public_tracking_token"], session_id="visitor-1")
    second = service.assign_variant(tracking_token=test["public_tracking_token"], session_id="visitor-1")
    assert first["variant_id"] == second["variant_id"]


def test_public_event_requires_assigned_variant_and_reuses_duplicate() -> None:
    repo = FakeRepository()
    service = AdABTestService(repository=repo)  # type: ignore[arg-type]
    test = create_running(service)
    assignment = service.assign_variant(tracking_token=test["public_tracking_token"], session_id="visitor-1")
    other_variant = next(row for row in test["variants"] if row["id"] != assignment["variant_id"])

    with pytest.raises(ValueError, match="assigned session variant"):
        service.ingest_public_lp_event(
            tracking_token=test["public_tracking_token"],
            payload={
                "experiment_id": test["id"],
                "variant_id": other_variant["id"],
                "session_id": "visitor-1",
                "event_name": "PAGE_VIEW",
                "idempotency_key": "untrusted-key",
            },
        )

    payload = {
        "experiment_id": test["id"],
        "variant_id": assignment["variant_id"],
        "session_id": "visitor-1",
        "event_name": "PAGE_VIEW",
        "idempotency_key": "client-key-is-not-trusted",
    }
    first = service.ingest_public_lp_event(tracking_token=test["public_tracking_token"], payload=payload)
    second = service.ingest_public_lp_event(tracking_token=test["public_tracking_token"], payload=payload)
    assert first["id"] == second["id"]
    assert second["_reused"] is True
    assert len(repo.rows["lp_analytics_events"]) == 1


def test_public_event_rejects_revenue_and_conversion() -> None:
    repo = FakeRepository()
    service = AdABTestService(repository=repo)  # type: ignore[arg-type]
    test = create_running(service)
    assignment = service.assign_variant(tracking_token=test["public_tracking_token"], session_id="visitor-2")

    with pytest.raises(ValueError, match="authenticated server-side source"):
        service.ingest_public_lp_event(
            tracking_token=test["public_tracking_token"],
            payload={
                "experiment_id": test["id"],
                "variant_id": assignment["variant_id"],
                "session_id": "visitor-2",
                "event_name": "CONVERSION",
                "idempotency_key": "conversion-key",
                "revenue": 100,
            },
        )
