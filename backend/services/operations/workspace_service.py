from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.services.supabase.supabase_repository import SupabaseRepository


PROJECT_STATUSES = {"ACTIVE", "PAUSED", "ARCHIVED", "DELETED"}


class WorkspaceService:
    def __init__(self, repository: SupabaseRepository) -> None:
        self.repository = repository

    def list_projects(self, *, user_id: str, status: str | None = None) -> list[dict[str, Any]]:
        filters = {"status": status} if status else None
        return self.repository.get_many("ad_projects", user_id=user_id, filters=filters, order="updated_at.desc", limit=100)

    def create_project(self, *, user_id: str, name: str, description: str | None) -> dict[str, Any]:
        return self.repository.insert("ad_projects", {"user_id": user_id, "name": name.strip(), "description": description, "status": "ACTIVE"})

    def update_project(self, *, user_id: str, project_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        allowed = {key: value for key, value in payload.items() if key in {"name", "description", "status"} and value is not None}
        status = allowed.get("status")
        if status and status not in PROJECT_STATUSES:
            raise ValueError("Invalid project status.")
        if status == "ARCHIVED":
            allowed["archived_at"] = _now()
        elif status == "DELETED":
            allowed["deleted_at"] = _now()
        elif status == "ACTIVE":
            allowed.update({"archived_at": None, "deleted_at": None})
        return self.repository.update("ad_projects", user_id=user_id, filters={"id": project_id}, payload=allowed)

    def duplicate_project(self, *, user_id: str, project_id: str) -> dict[str, Any]:
        source = self.repository.get_one("ad_projects", user_id=user_id, filters={"id": project_id})
        duplicate = self.repository.insert(
            "ad_projects",
            {
                "user_id": user_id,
                "name": f"{source['name']} (Copy)",
                "description": source.get("description"),
                "status": "ACTIVE",
                "duplicated_from": source["id"],
            },
        )
        ad_ids: dict[str, str] = {}
        lp_ids: dict[str, str] = {}
        for row in self.repository.get_many("twitter_ads", user_id=user_id, filters={"project_id": project_id}):
            old_id = row.pop("id")
            for key in ("created_at", "updated_at"):
                row.pop(key, None)
            row["project_id"] = duplicate["id"]
            ad_ids[old_id] = self.repository.insert("twitter_ads", row)["id"]
        for row in self.repository.get_many("landing_pages", user_id=user_id, filters={"project_id": project_id}):
            old_id = row.pop("id")
            for key in ("created_at", "updated_at"):
                row.pop(key, None)
            row["project_id"] = duplicate["id"]
            lp_ids[old_id] = self.repository.insert("landing_pages", row)["id"]
        for row in self.repository.get_many("ad_lp_pairs", user_id=user_id, filters={"project_id": project_id}):
            row.pop("id", None)
            for key in ("created_at", "updated_at", "last_analyzed_at"):
                row.pop(key, None)
            if row["twitter_ad_id"] in ad_ids and row["landing_page_id"] in lp_ids:
                row.update({
                    "project_id": duplicate["id"],
                    "twitter_ad_id": ad_ids[row["twitter_ad_id"]],
                    "landing_page_id": lp_ids[row["landing_page_id"]],
                })
                self.repository.insert("ad_lp_pairs", row)
        return duplicate

    def search(self, *, user_id: str, query: str, limit: int = 30) -> list[dict[str, Any]]:
        if not query.strip():
            return []
        return self.repository.rpc("global_workspace_search", {"p_user_id": user_id, "p_query": query.strip(), "p_limit": limit})

    def dashboard(self, *, user_id: str) -> dict[str, Any]:
        result = self.repository.rpc("get_operations_dashboard", {"p_user_id": user_id})
        return result if isinstance(result, dict) else {}

    def list_notifications(self, *, user_id: str, unread_only: bool = False) -> list[dict[str, Any]]:
        rows = self.repository.get_many(
            "user_notifications",
            user_id=user_id,
            order="created_at.desc",
            limit=100,
        )
        return [row for row in rows if row.get("read_at") is None] if unread_only else rows

    def update_notification(self, *, user_id: str, notification_id: str, read: bool) -> dict[str, Any]:
        return self.repository.update(
            "user_notifications",
            user_id=user_id,
            filters={"id": notification_id},
            payload={"read_at": _now() if read else None},
        )

    def delete_notification(self, *, user_id: str, notification_id: str) -> None:
        self.repository.delete("user_notifications", user_id=user_id, filters={"id": notification_id})

    def list_activity(self, *, user_id: str, project_id: str | None = None) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "activity_events",
            user_id=user_id,
            filters={"project_id": project_id} if project_id else None,
            order="created_at.desc",
            limit=100,
        )

    def list_jobs(self, *, user_id: str, status: str | None = None) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "background_jobs",
            user_id=user_id,
            filters={"status": status} if status else None,
            order="created_at.desc",
            limit=100,
        )

    def retry_job(self, *, user_id: str, job_id: str) -> dict[str, Any]:
        job = self.repository.get_one("background_jobs", user_id=user_id, filters={"id": job_id})
        if job["status"] != "FAILED":
            raise ValueError("Only failed jobs can be retried.")
        if int(job.get("attempt_count") or 0) >= int(job.get("max_attempts") or 3):
            raise ValueError("Maximum retry count reached.")
        return self.repository.update(
            "background_jobs",
            user_id=user_id,
            filters={"id": job_id},
            payload={"status": "QUEUED", "attempt_count": int(job.get("attempt_count") or 0) + 1, "error_code": None, "error_message": None},
        )

    def get_job(self, *, user_id: str, job_id: str) -> dict[str, Any]:
        return self.repository.get_one("background_jobs", user_id=user_id, filters={"id": job_id})

    def finish_job_retry(self, *, user_id: str, job_id: str, succeeded: bool, result: dict[str, Any] | None = None, error: str | None = None) -> dict[str, Any]:
        return self.repository.update(
            "background_jobs",
            user_id=user_id,
            filters={"id": job_id},
            payload={
                "status": "SUCCEEDED" if succeeded else "FAILED",
                "result": result or {},
                "error_code": None if succeeded else "RETRY_FAILED",
                "error_message": error,
                "finished_at": _now(),
            },
        )

    def list_saved_views(self, *, user_id: str) -> list[dict[str, Any]]:
        return self.repository.get_many("saved_views", user_id=user_id, order="is_favorite.desc,updated_at.desc", limit=100)

    def create_saved_view(self, *, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self.repository.insert("saved_views", {"user_id": user_id, **payload})

    def update_saved_view(self, *, user_id: str, view_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self.repository.update("saved_views", user_id=user_id, filters={"id": view_id}, payload=payload)

    def delete_saved_view(self, *, user_id: str, view_id: str) -> None:
        self.repository.delete("saved_views", user_id=user_id, filters={"id": view_id})

    def get_settings(self, *, user_id: str) -> dict[str, Any]:
        rows = self.repository.get_many("user_workspace_settings", user_id=user_id, limit=1)
        if rows:
            return rows[0]
        return self.repository.insert("user_workspace_settings", {"user_id": user_id})

    def update_settings(self, *, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        self.get_settings(user_id=user_id)
        return self.repository.update("user_workspace_settings", user_id=user_id, filters={}, payload=payload)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
