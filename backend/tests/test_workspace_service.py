from __future__ import annotations

from copy import deepcopy

import pytest

from backend.services.operations.workspace_service import WorkspaceService


class FakeRepository:
    def __init__(self) -> None:
        self.rows = {
            "ad_projects": [{"id": "p1", "user_id": "u1", "name": "Alpha", "description": "A", "status": "ACTIVE"}],
            "twitter_ads": [], "landing_pages": [], "ad_lp_pairs": [],
            "user_notifications": [{"id": "n1", "user_id": "u1", "read_at": None}],
            "background_jobs": [{"id": "j1", "user_id": "u1", "status": "FAILED", "attempt_count": 1, "max_attempts": 3}],
            "activity_events": [], "saved_views": [], "user_workspace_settings": [],
        }

    def get_many(self, table, *, user_id, filters=None, **_):
        rows = [deepcopy(row) for row in self.rows[table] if row.get("user_id") == user_id]
        return [row for row in rows if all(row.get(key) == value for key, value in (filters or {}).items())]

    def get_one(self, table, *, user_id, filters, **_):
        return self.get_many(table, user_id=user_id, filters=filters)[0]

    def insert(self, table, payload):
        row = {"id": f"{table}-{len(self.rows[table]) + 1}", **deepcopy(payload)}
        self.rows[table].append(row)
        return deepcopy(row)

    def update(self, table, *, user_id, filters, payload):
        row = next(row for row in self.rows[table] if row.get("user_id") == user_id and all(row.get(key) == value for key, value in filters.items()))
        row.update(deepcopy(payload))
        return deepcopy(row)

    def rpc(self, function_name, payload):
        if function_name == "global_workspace_search":
            return [{"result_type": "project", "title": payload["p_query"]}]
        return {"active_projects": 1}


def test_project_lifecycle_and_duplicate() -> None:
    repository = FakeRepository()
    service = WorkspaceService(repository)  # type: ignore[arg-type]
    archived = service.update_project(user_id="u1", project_id="p1", payload={"status": "ARCHIVED"})
    assert archived["status"] == "ARCHIVED"
    assert archived["archived_at"]
    duplicate = service.duplicate_project(user_id="u1", project_id="p1")
    assert duplicate["status"] == "ACTIVE"
    assert duplicate["duplicated_from"] == "p1"


def test_invalid_project_status_is_rejected() -> None:
    with pytest.raises(ValueError, match="Invalid project status"):
        WorkspaceService(FakeRepository()).update_project(user_id="u1", project_id="p1", payload={"status": "BROKEN"})  # type: ignore[arg-type]


def test_notifications_search_and_failed_job_retry() -> None:
    service = WorkspaceService(FakeRepository())  # type: ignore[arg-type]
    assert len(service.list_notifications(user_id="u1", unread_only=True)) == 1
    assert service.search(user_id="u1", query="alpha")[0]["title"] == "alpha"
    retried = service.retry_job(user_id="u1", job_id="j1")
    assert retried["status"] == "QUEUED"
    assert retried["attempt_count"] == 2
