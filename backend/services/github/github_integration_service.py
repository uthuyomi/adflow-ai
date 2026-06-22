from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hmac
import hashlib
import secrets
from typing import Any
from urllib.parse import urlencode

from backend.services.github.github_app_auth import GitHubAppAuth
from backend.services.github.github_api_client import GitHubAPIClient
from backend.services.improvements.improvement_workflow_service import ImprovementWorkflowService
from backend.services.supabase.supabase_repository import SupabaseRepository


class GitHubIntegrationService:
    def __init__(
        self,
        repository: SupabaseRepository,
        *,
        app_id: str | None = None,
        private_key: str | None = None,
        client_id: str | None = None,
        webhook_secret: str | None = None,
        callback_url: str | None = None,
        frontend_url: str = "http://localhost:3000",
    ) -> None:
        self.repository = repository
        self.auth = GitHubAppAuth(app_id=app_id, private_key=private_key, client_id=client_id)
        self.webhook_secret = webhook_secret or ""
        self.callback_url = callback_url or ""
        self.frontend_url = frontend_url.rstrip("/")

    def start_installation(self, *, user_id: str, return_path: str = "/settings") -> dict[str, str]:
        if not self.auth.configured or not self.callback_url:
            raise ValueError("GitHub App is not configured.")
        state = secrets.token_urlsafe(32)
        safe_path = return_path if return_path.startswith("/") else "/settings"
        self.repository.insert(
            "github_app_install_sessions",
            {
                "user_id": user_id,
                "state": state,
                "return_path": safe_path,
                "status": "pending",
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            },
        )
        slug = str(self.auth.get_app()["slug"])
        return {
            "authorization_url": f"https://github.com/apps/{slug}/installations/new?"
            + urlencode({"state": state})
        }

    def complete_installation(self, *, installation_id: int | None, state: str | None, setup_action: str | None = None) -> str:
        if not installation_id or not state or not self.auth.configured:
            return f"{self.frontend_url}/settings?github=failed"
        sessions = self.repository.get_related_many("github_app_install_sessions", filters={"state": state}, limit=1)
        if not sessions or sessions[0].get("status") != "pending":
            return f"{self.frontend_url}/settings?github=invalid_session"
        session = sessions[0]
        expires_at = datetime.fromisoformat(str(session["expires_at"]).replace("Z", "+00:00"))
        if expires_at <= datetime.now(timezone.utc):
            self.repository.update("github_app_install_sessions", user_id=session["user_id"], filters={"id": session["id"]}, payload={"status": "expired"})
            return f"{self.frontend_url}{session['return_path']}?github=expired"
        if setup_action not in {None, "install", "update"}:
            self.repository.update("github_app_install_sessions", user_id=session["user_id"], filters={"id": session["id"]}, payload={"status": "failed"})
            return f"{self.frontend_url}{session['return_path']}?github=failed"
        try:
            self._save_installation(user_id=session["user_id"], installation_id=installation_id)
        except ValueError:
            self.repository.update("github_app_install_sessions", user_id=session["user_id"], filters={"id": session["id"]}, payload={"status": "failed"})
            return f"{self.frontend_url}{session['return_path']}?github=already_linked"
        self.repository.update("github_app_install_sessions", user_id=session["user_id"], filters={"id": session["id"]}, payload={"status": "completed"})
        return f"{self.frontend_url}{session['return_path']}?github=connected"

    def claim_available_installation(self, *, user_id: str) -> dict[str, Any]:
        pending = self.repository.get_many(
            "github_app_install_sessions",
            user_id=user_id,
            filters={"status": "pending"},
            order="created_at.desc",
            limit=10,
        )
        now = datetime.now(timezone.utc)
        pending = [
            row
            for row in pending
            if datetime.fromisoformat(str(row["expires_at"]).replace("Z", "+00:00")) > now
        ]
        if len(pending) != 1:
            raise ValueError("Exactly one active GitHub App installation session is required.")

        linked_ids = {
            int(row["installation_id"])
            for row in self.repository.get_related_many(
                "github_connections",
                filters={"auth_type": "GITHUB_APP"},
                limit=1000,
            )
            if row.get("installation_id")
        }
        available = [
            installation
            for installation in self.auth.app_client().get("/app/installations?per_page=100")
            if int(installation["id"]) not in linked_ids and not installation.get("suspended_at")
        ]
        if len(available) != 1:
            raise ValueError("Exactly one unlinked GitHub App installation is required.")

        connection = self._save_installation(
            user_id=user_id,
            installation_id=int(available[0]["id"]),
        )
        self.repository.update(
            "github_app_install_sessions",
            user_id=user_id,
            filters={"id": pending[0]["id"]},
            payload={"status": "completed"},
        )
        return self._public_connection(connection)

    def list_connections(self, *, user_id: str) -> list[dict[str, Any]]:
        return [self._public_connection(row) for row in self.repository.get_many("github_connections", user_id=user_id, order="created_at.desc")]

    def revoke(self, *, user_id: str, connection_id: str) -> dict[str, Any]:
        connection = self.repository.get_one("github_connections", user_id=user_id, filters={"id": connection_id})
        if connection.get("auth_type") == "GITHUB_APP" and connection.get("installation_id"):
            self.auth.delete_installation(int(connection["installation_id"]))
        row = self.repository.update(
            "github_connections",
            user_id=user_id,
            filters={"id": connection_id},
            payload={"status": "revoked", "last_verified_at": _now()},
        )
        return self._public_connection(row)

    def list_repositories(self, *, user_id: str, connection_id: str) -> list[dict[str, Any]]:
        connection = self._connection(user_id, connection_id)
        client = self._client_for_connection(connection)
        can_push = self._installation_can_write_contents(connection)
        return [
            self._public_repo(row, can_push=can_push)
            for row in client.list_repositories()
            if not row.get("archived") and not row.get("disabled")
        ]

    def list_branches(self, *, user_id: str, connection_id: str, repository: str) -> list[dict[str, Any]]:
        return self._client(user_id, connection_id).get(f"/repos/{repository}/branches?per_page=100")

    def select_repository(self, *, user_id: str, connection_id: str, repository: str) -> dict[str, Any]:
        connection = self._connection(user_id, connection_id)
        client = self._client_for_connection(connection)
        repo = client.get(f"/repos/{repository}")
        permission = "push" if self._installation_can_write_contents(connection) else "read"
        if permission != "push":
            raise ValueError("GitHub repository push permission is required.")
        existing = self.repository.get_many("github_repository_selections", user_id=user_id, filters={"repository_full_name": repository}, limit=1)
        payload = {"connection_id": connection_id, "repository_full_name": repository, "github_repository_id": str(repo["id"]), "default_branch": repo["default_branch"], "permission": permission, "status": "active", "last_verified_at": _now(), "last_error": None}
        return self.repository.update("github_repository_selections", user_id=user_id, filters={"id": existing[0]["id"]}, payload=payload) if existing else self.repository.insert("github_repository_selections", {"user_id": user_id, **payload})

    def list_pull_requests(self, *, user_id: str) -> list[dict[str, Any]]:
        return self.repository.get_many("github_pull_requests", user_id=user_id, order="created_at.desc", limit=200)

    def create_pull_request(
        self,
        *,
        user_id: str,
        improvement_id: str,
        repository_selection_id: str,
        files: list[dict[str, Any]] | None = None,
        codex_task_id: str | None = None,
        codex_execution_id: str | None = None,
        title: str | None = None,
    ) -> dict[str, Any]:
        improvement = ImprovementWorkflowService(self.repository).get_improvement(user_id=user_id, improvement_id=improvement_id)
        if improvement.get("decision_status") != "APPLY_READY":
            raise ValueError("Improvement must be APPLY_READY before creating a GitHub pull request.")
        selection = self.repository.get_one("github_repository_selections", user_id=user_id, filters={"id": repository_selection_id})
        branch = f"adflow/codex/{codex_task_id}" if codex_task_id else f"adflow/{improvement_id}"
        title = str(title or (improvement.get("output") or {}).get("summary") or improvement.get("task") or "AdFlow improvement")[:120]
        if not files:
            files = [{"path": f"docs/adflow-improvements/{improvement_id}.md", "content": self._artifact(improvement, selection["repository_full_name"], branch)}]
        record_payload = {
            "user_id": user_id, "improvement_id": improvement_id, "connection_id": selection["connection_id"],
            "repository_selection_id": selection["id"], "repository": selection["repository_full_name"],
            "base_branch": selection["default_branch"], "branch_name": branch, "diff_payload": {"files": files},
            "pr_title": title, "pr_body": f"## AdFlow Improvement\n\nSource improvement: `{improvement_id}`\n\nReview the generated implementation brief before merging.",
            "created_by": user_id, "status": "CREATING", "codex_task_id": codex_task_id, "codex_execution_id": codex_execution_id,
            "error_message": None,
        }
        failed_records = self.repository.get_many("github_pull_requests", user_id=user_id, filters={"codex_task_id": codex_task_id, "repository": selection["repository_full_name"], "status": "FAILED"}, limit=1) if codex_task_id else []
        record = self.repository.update("github_pull_requests", user_id=user_id, filters={"id": failed_records[0]["id"]}, payload=record_payload) if failed_records else self.repository.insert("github_pull_requests", record_payload)
        self._event(user_id, record, "creation_started")
        client = None
        try:
            client = self._client(user_id, selection["connection_id"])
            repo = client.get(f"/repos/{selection['repository_full_name']}")
            connection = self._connection(user_id, selection["connection_id"])
            if not self._installation_can_write_contents(connection):
                raise ValueError("GitHub repository push permission is required.")
            base = client.get(f"/repos/{selection['repository_full_name']}/git/ref/heads/{selection['default_branch']}")
            base_sha = base["object"]["sha"]
            commit = client.get(f"/repos/{selection['repository_full_name']}/git/commits/{base_sha}")
            tree_elements = []
            for file in files:
                path = str(file.get("path") or "").strip().replace("\\", "/")
                if not path or path.startswith("/") or ".." in path.split("/"):
                    raise ValueError("Codex file path is invalid.")
                blob_sha = None if file.get("deleted") else client.create_blob(selection["repository_full_name"], str(file.get("content") or ""))
                tree_elements.append({"path": path, "mode": "100644", "type": "blob", "sha": blob_sha})
            tree = client.post(f"/repos/{selection['repository_full_name']}/git/trees", {"base_tree": commit["tree"]["sha"], "tree": tree_elements})
            commit_message = f"feat: apply Codex task {codex_task_id}" if codex_task_id else f"docs: add AdFlow improvement {improvement_id}"
            new_commit = client.post(f"/repos/{selection['repository_full_name']}/git/commits", {"message": commit_message, "tree": tree["sha"], "parents": [base_sha]})
            client.post(f"/repos/{selection['repository_full_name']}/git/refs", {"ref": f"refs/heads/{branch}", "sha": new_commit["sha"]})
            record = self.repository.update(
                "github_pull_requests",
                user_id=user_id,
                filters={"id": record["id"]},
                payload={"github_branch_id": new_commit["sha"], "commit_sha": new_commit["sha"], "commit_message": commit_message},
            )
            self._event(user_id, record, "commit_created")
            pr = client.post(f"/repos/{selection['repository_full_name']}/pulls", {"title": title, "body": record["pr_body"], "head": branch, "base": selection["default_branch"], "maintainer_can_modify": False})
            updated = self.repository.update("github_pull_requests", user_id=user_id, filters={"id": record["id"]}, payload={"github_branch_id": new_commit["sha"], "commit_sha": new_commit["sha"], "commit_message": commit_message, "pr_number": pr["number"], "pr_url": pr["html_url"], "status": "OPEN", "last_synced_at": _now()})
            self._event(user_id, updated, "pr_created")
            return updated
        except Exception as exc:
            if client:
                try:
                    client.delete(f"/repos/{selection['repository_full_name']}/git/refs/heads/{branch}")
                except Exception:
                    pass
            failed = self.repository.update("github_pull_requests", user_id=user_id, filters={"id": record["id"]}, payload={"status": "FAILED", "error_message": str(exc)})
            self._event(user_id, failed, "creation_failed", str(exc))
            raise

    def sync(self, *, user_id: str, pull_request_id: str) -> dict[str, Any]:
        record = self.repository.get_one("github_pull_requests", user_id=user_id, filters={"id": pull_request_id})
        if not record.get("pr_number"):
            return record
        try:
            pr = self._client(user_id, record["connection_id"]).get(f"/repos/{record['repository']}/pulls/{record['pr_number']}")
            status = "MERGED" if pr.get("merged") else ("OPEN" if pr.get("state") == "open" else "CLOSED")
            updated = self.repository.update("github_pull_requests", user_id=user_id, filters={"id": record["id"]}, payload={"status": status, "last_synced_at": _now(), "error_message": None})
            if status != record.get("status"):
                self._event(user_id, updated, "status_synced")
            return updated
        except Exception as exc:
            failed_sync = self.repository.update(
                "github_pull_requests",
                user_id=user_id,
                filters={"id": record["id"]},
                payload={"last_synced_at": _now(), "error_message": str(exc)},
            )
            self._event(user_id, failed_sync, "sync_failed", str(exc))
            raise

    def sync_all(self, *, user_id: str) -> list[dict[str, Any]]:
        return [
            self.sync(user_id=user_id, pull_request_id=row["id"])
            for row in self.repository.get_many("github_pull_requests", user_id=user_id, filters={"status": ["OPEN", "CLOSED"]}, limit=200)
        ]

    def sync_all_tracked(self) -> dict[str, int]:
        active_connection_ids = {
            row["id"] for row in self.repository.get_related_many("github_connections", filters={"status": "active"}, limit=1000)
        }
        records = [
            row
            for row in self.repository.get_related_many("github_pull_requests", filters={}, limit=1000)
            if row.get("pr_number") and row.get("status") in {"OPEN", "CLOSED"} and row.get("connection_id") in active_connection_ids
        ]
        synced = failed = 0
        for record in records:
            try:
                self.sync(user_id=record["user_id"], pull_request_id=record["id"])
                synced += 1
            except Exception:
                failed += 1
        return {"total": len(records), "synced": synced, "failed": failed}

    def configuration(self) -> dict[str, bool]:
        return {"app_enabled": bool(self.auth.configured and self.callback_url)}

    def _client(self, user_id: str, connection_id: str) -> GitHubAPIClient:
        return self._client_for_connection(self._connection(user_id, connection_id))

    def _connection(self, user_id: str, connection_id: str) -> dict[str, Any]:
        return self.repository.get_one("github_connections", user_id=user_id, filters={"id": connection_id})

    def _client_for_connection(self, connection: dict[str, Any]) -> GitHubAPIClient:
        if connection.get("status") != "active":
            raise ValueError("GitHub connection is not active.")
        if connection.get("auth_type") != "GITHUB_APP" or not connection.get("installation_id"):
            raise ValueError("This GitHub connection must be reinstalled as a GitHub App.")
        return self.auth.installation_client(int(connection["installation_id"]))

    def _installation_can_write_contents(self, connection: dict[str, Any]) -> bool:
        installation = self.auth.get_installation(int(connection["installation_id"]))
        return str((installation.get("permissions") or {}).get("contents") or "").lower() == "write"

    def _save_installation(self, *, user_id: str, installation_id: int) -> dict[str, Any]:
        installation = self.auth.get_installation(installation_id)
        linked = self.repository.get_related_many(
            "github_connections",
            filters={"installation_id": installation_id},
            limit=1,
        )
        if linked and linked[0].get("user_id") != user_id:
            raise ValueError("GitHub App installation is already linked to another user.")
        account = installation.get("account") or {}
        payload = {
            "auth_type": "GITHUB_APP",
            "installation_id": installation_id,
            "account_id": str(account.get("id") or ""),
            "account_login": str(account.get("login") or ""),
            "account_type": str(account.get("type") or ""),
            "github_user_id": str(account.get("id") or ""),
            "github_login": str(account.get("login") or ""),
            "repository_selection_mode": installation.get("repository_selection"),
            "installed_at": _now(),
            "suspended_at": installation.get("suspended_at"),
            "status": "active" if not installation.get("suspended_at") else "invalid",
            "last_verified_at": _now(),
            "last_error": None,
            "encrypted_access_token": None,
            "scopes": ["contents:write", "metadata:read", "pull_requests:write"],
        }
        existing = self.repository.get_many(
            "github_connections",
            user_id=user_id,
            filters={"installation_id": installation_id},
            limit=1,
        )
        if existing:
            return self.repository.update(
                "github_connections",
                user_id=user_id,
                filters={"id": existing[0]["id"]},
                payload=payload,
            )
        return self.repository.insert("github_connections", {"user_id": user_id, **payload})

    def installation_token_for_selection(self, *, user_id: str, repository_selection_id: str) -> tuple[dict[str, Any], str]:
        selection = self.repository.get_one(
            "github_repository_selections",
            user_id=user_id,
            filters={"id": repository_selection_id},
        )
        connection = self.repository.get_one(
            "github_connections",
            user_id=user_id,
            filters={"id": selection["connection_id"]},
        )
        if connection.get("auth_type") != "GITHUB_APP" or connection.get("status") != "active":
            raise ValueError("An active GitHub App installation is required.")
        token = self.auth.create_installation_token(int(connection["installation_id"])).token
        return selection, token

    def handle_webhook(self, *, body: bytes, signature: str | None, event: str | None) -> dict[str, Any]:
        if not self.webhook_secret:
            raise ValueError("GitHub webhook is not configured.")
        expected = "sha256=" + hmac.new(self.webhook_secret.encode(), body, hashlib.sha256).hexdigest()
        if not signature or not hmac.compare_digest(expected, signature):
            raise ValueError("Invalid GitHub webhook signature.")
        import json

        payload = json.loads(body.decode("utf-8"))
        installation_id = (payload.get("installation") or {}).get("id")
        if event == "installation" and installation_id:
            rows = self.repository.get_related_many("github_connections", filters={"installation_id": installation_id}, limit=10)
            action = payload.get("action")
            for row in rows:
                status = "revoked" if action == "deleted" else ("invalid" if action == "suspend" else "active")
                self.repository.update(
                    "github_connections",
                    user_id=row["user_id"],
                    filters={"id": row["id"]},
                    payload={"status": status, "suspended_at": _now() if status == "invalid" else None, "last_verified_at": _now()},
                )
        elif event == "installation_repositories" and installation_id:
            rows = self.repository.get_related_many("github_connections", filters={"installation_id": installation_id}, limit=10)
            removed = {str(repo.get("full_name") or "") for repo in payload.get("repositories_removed") or []}
            for row in rows:
                selections = self.repository.get_many(
                    "github_repository_selections",
                    user_id=row["user_id"],
                    filters={"connection_id": row["id"]},
                    limit=500,
                )
                for selection in selections:
                    if selection.get("repository_full_name") in removed:
                        self.repository.update(
                            "github_repository_selections",
                            user_id=row["user_id"],
                            filters={"id": selection["id"]},
                            payload={"status": "missing", "last_verified_at": _now(), "last_error": "Repository removed from GitHub App installation."},
                        )
        return {"accepted": True}

    def _event(self, user_id: str, record: dict[str, Any], event_type: str, error: str | None = None) -> None:
        self.repository.insert("github_pr_events", {"user_id": user_id, "github_pull_request_id": record["id"], "improvement_id": record["improvement_id"], "repository": record["repository"], "branch": record.get("branch_name"), "commit_sha": record.get("commit_sha"), "pr_number": record.get("pr_number"), "pr_url": record.get("pr_url"), "created_by": user_id, "status": record["status"], "event_type": event_type, "error_message": error})

    @staticmethod
    def _artifact(improvement: dict[str, Any], repository: str, branch: str) -> str:
        output = improvement.get("output") or {}
        recommendations = output.get("recommendations") or []
        return "\n".join(["# AdFlow Improvement Brief", "", f"- Improvement ID: `{improvement['id']}`", f"- Repository: `{repository}`", f"- Branch: `{branch}`", f"- Risk: `{improvement.get('risk_level') or 'unknown'}`", "", "## Summary", "", str(output.get("summary") or improvement.get("task") or "Improvement proposal"), "", "## Recommendations", "", *[f"- {item}" for item in recommendations], "", "## Review", "", "This file is generated from an approved Apply Ready improvement and must be reviewed before merge.", ""])

    @staticmethod
    def _public_connection(row: dict[str, Any]) -> dict[str, Any]:
        public = {key: value for key, value in row.items() if key != "encrypted_access_token"}
        if public.get("auth_type") != "GITHUB_APP":
            public["migration_required"] = True
        return public

    @staticmethod
    def _public_repo(row: dict[str, Any], *, can_push: bool | None = None) -> dict[str, Any]:
        permissions = dict(row.get("permissions") or {})
        if can_push is not None:
            permissions["push"] = can_push
        return {"id": str(row["id"]), "full_name": row["full_name"], "default_branch": row["default_branch"], "permissions": permissions, "archived": row.get("archived", False)}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
