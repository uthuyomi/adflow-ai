from __future__ import annotations

from copy import deepcopy
from typing import Any

import pytest
from fastapi.testclient import TestClient

from backend.api import main
from backend.services.billing.entitlements import PlanAccessError, PlanEntitlementService


class FakeRepository:
    def __init__(self, *, plan: str = "free", status: str = "inactive", saved_items: int = 0) -> None:
        self.plan = plan
        self.status = status
        self.saved_items = saved_items

    def get_many(self, table: str, *, user_id: str, filters=None, **_: Any) -> list[dict[str, Any]]:
        if table == "user_billing_profiles":
            if self.plan == "free" and self.status == "inactive":
                return []
            return [{"user_id": user_id, "plan": self.plan, "subscription_status": self.status}]
        return []

    def count(self, table: str, *, user_id: str, filters=None) -> int:
        if table == "ad_projects" and filters == {"status": "ACTIVE"}:
            return self.saved_items
        return 0


@pytest.mark.parametrize(
    ("plan", "status", "pair_allowed", "experiment_allowed"),
    [
        ("free", "inactive", False, False),
        ("starter", "active", True, False),
        ("growth", "active", True, True),
        ("business", "trialing", True, True),
        ("growth", "past_due", False, False),
    ],
)
def test_plan_entitlement_matrix(
    plan: str,
    status: str,
    pair_allowed: bool,
    experiment_allowed: bool,
) -> None:
    service = PlanEntitlementService(FakeRepository(plan=plan, status=status))  # type: ignore[arg-type]
    entitlements = service.get_entitlements(user_id="user-1")
    assert entitlements.pair_analysis is pair_allowed
    assert entitlements.experiment_create is experiment_allowed


def test_free_saved_item_limit_allows_ninth_and_tenth_but_rejects_eleventh() -> None:
    ninth = PlanEntitlementService(FakeRepository(saved_items=9))  # type: ignore[arg-type]
    assert ninth.require_saved_item_capacity(user_id="user-1") == 9

    full = PlanEntitlementService(FakeRepository(saved_items=10))  # type: ignore[arg-type]
    with pytest.raises(PlanAccessError) as caught:
        full.require_saved_item_capacity(user_id="user-1")
    assert caught.value.code == "PLAN_LIMIT_REACHED"
    assert caught.value.limit == 10
    assert caught.value.current_usage == 10


class StubWorkspaceService:
    def create_project(self, *, user_id: str, name: str, description: str | None) -> dict[str, Any]:
        return {"id": "project-1", "user_id": user_id, "name": name, "description": description, "status": "ACTIVE"}


class StubAnalysisService:
    def run(self, **payload: Any) -> dict[str, Any]:
        return {"id": "analysis-1", **deepcopy(payload)}


class StubExperimentService:
    def create_test(self, **payload: Any) -> dict[str, Any]:
        return {"id": "experiment-1", "status": "DRAFT", **deepcopy(payload)}


@pytest.fixture
def api_client(monkeypatch: pytest.MonkeyPatch):
    state = {"repository": FakeRepository()}
    main.app.dependency_overrides[main._authenticated_user_id] = lambda: "user-1"
    monkeypatch.setattr(main, "_repository_for_settings", lambda _settings: state["repository"])
    monkeypatch.setattr(main, "_build_workspace_service", lambda _settings: StubWorkspaceService())
    monkeypatch.setattr(main, "_build_registered_pair_analysis", lambda _settings: StubAnalysisService())
    monkeypatch.setattr(main, "_build_ad_ab_test_service", lambda _settings: StubExperimentService())
    monkeypatch.setattr(main, "_require_feature_credits", lambda **_: None)
    monkeypatch.setattr(main, "_consume_feature_credits", lambda **_: None)
    with TestClient(main.app) as client:
        yield client, state
    main.app.dependency_overrides.clear()


@pytest.mark.parametrize(
    ("plan", "pair_status", "experiment_status"),
    [
        ("free", 403, 403),
        ("starter", 200, 403),
        ("growth", 200, 200),
    ],
)
def test_api_enforces_pair_and_experiment_plan_gates(
    api_client,
    plan: str,
    pair_status: int,
    experiment_status: int,
) -> None:
    client, state = api_client
    state["repository"] = FakeRepository(
        plan=plan,
        status="inactive" if plan == "free" else "active",
    )

    pair = client.post("/analysis/pairs/pair-1/run", json={"ai_mode": "openai_only", "locale": "ja"})
    assert pair.status_code == pair_status
    experiment = client.post(
        "/ad-optimization/projects/project-1/ab-tests",
        json={
            "name": "CTA test",
            "primary_metric": "ctr",
            "ad_ids": ["ad-1", "ad-2"],
        },
    )
    assert experiment.status_code == experiment_status

    if pair_status == 403:
        assert pair.json()["detail"]["error"] == "PLAN_UPGRADE_REQUIRED"
        assert pair.json()["detail"]["requiredPlan"] == "starter"
    if experiment_status == 403:
        assert experiment.json()["detail"]["error"] == "PLAN_UPGRADE_REQUIRED"
        assert experiment.json()["detail"]["requiredPlan"] == "growth"


def test_api_enforces_free_saved_item_limit(api_client) -> None:
    client, state = api_client
    state["repository"] = FakeRepository(saved_items=10)
    rejected = client.post("/operations/projects", json={"name": "Blocked"})
    assert rejected.status_code == 403
    assert rejected.json()["detail"] == {
        "error": "PLAN_LIMIT_REACHED",
        "message": "Free plan supports up to 10 saved items.",
        "currentPlan": "free",
        "requiredPlan": "starter",
        "feature": "saved_items",
        "limit": 10,
        "currentUsage": 10,
        "pricingUrl": "/pricing",
    }

    state["repository"] = FakeRepository(saved_items=9)
    allowed = client.post("/operations/projects", json={"name": "Allowed"})
    assert allowed.status_code == 200
