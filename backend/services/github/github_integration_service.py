from __future__ import annotations

from datetime import datetime, timedelta, timezone
import secrets
from typing import Any
from urllib.parse import urlencode

import requests

from backend.services.github.github_api_client import GitHubAPIClient
from backend.services.improvements.improvement_workflow_service import ImprovementWorkflowService
from backend.services.supabase.supabase_repository import SupabaseRepository
from backend.services.x_ads.token_cipher import TokenCipher


class GitHubIntegrationService:
    def __init__(self, repository: SupabaseRepository, encryption_key: str | None, *, oauth_client_id: str | None = None, oauth_client_secret: str | None = None, oauth_callback_url: str | None = None, frontend_url: str = "http://localhost:3000") -> None:
        self.repository = repository
        self.cipher = TokenCipher(encryption_key)
        self.oauth_client_id, self.oauth_client_secret, self.oauth_callback_url = oauth_client_id, oauth_client_secret, oauth_callback_url
        self.frontend_url = frontend_url.rstrip("/")

    def start_oauth(self, *, user_id: str, return_path: str = "/settings") -> dict[str, str]:
        if not self.oauth_client_id or not self.oauth_callback_url:
            raise ValueError("GitHub OAuth is not configured.")
        state = secrets.token_urlsafe(32)
        safe_path = return_path if return_path.startswith("/") else "/settings"
        self.repository.insert("github_oauth_sessions", {"user_id": user_id, "state": state, "return_path": safe_path, "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()})
        return {"authorization_url": "https://github.com/login/oauth/authorize?" + urlencode({"client_id": self.oauth_client_id, "redirect_uri": self.oauth_callback_url, "scope": "repo read:user", "state": state})}

    def complete_oauth(self, *, code: str | None, state: str | None) -> str:
        if not code or not state or not self.oauth_client_id or not self.oauth_client_secret:
            return f"{self.frontend_url}/settings?github=failed"
        sessions = self.repository.get_related_many("github_oauth_sessions", filters={"state": state}, limit=1)
        if not sessions or sessions[0].get("status") != "pending":
            return f"{self.frontend_url}/settings?github=invalid_session"
        session = sessions[0]
        expires_at = datetime.fromisoformat(str(session["expires_at"]).replace("Z", "+00:00"))
        if expires_at <= datetime.now(timezone.utc):
            self.repository.update("github_oauth_sessions", user_id=session["user_id"], filters={"id": session["id"]}, payload={"status": "expired"})
            return f"{self.frontend_url}{session['return_path']}?github=expired"
        response = requests.post("https://github.com/login/oauth/access_token", headers={"Accept": "application/json"}, json={"client_id": self.oauth_client_id, "client_secret": self.oauth_client_secret, "code": code, "redirect_uri": self.oauth_callback_url}, timeout=30)
        token = response.json().get("access_token")
        if not token:
            return f"{self.frontend_url}{session['return_path']}?github=failed"
        self.connect_token(user_id=session["user_id"], token=token)
        self.repository.update("github_oauth_sessions", user_id=session["user_id"], filters={"id": session["id"]}, payload={"status": "completed"})
        return f"{self.frontend_url}{session['return_path']}?github=connected"

    def connect_token(self, *, user_id: str, token: str) -> dict[str, Any]:
        client = GitHubAPIClient(token)
        profile = client.get("/user")
        payload = {
            "github_login": profile["login"],
            "encrypted_access_token": self.cipher.encrypt(token), "scopes": ["repo"], "status": "active",
            "last_verified_at": _now(), "last_error": None,
        }
        existing = self.repository.get_many(
            "github_connections",
            user_id=user_id,
            filters={"github_user_id": str(profile["id"])},
            limit=1,
        )
        connection = (
            self.repository.update("github_connections", user_id=user_id, filters={"id": existing[0]["id"]}, payload=payload)
            if existing
            else self.repository.insert("github_connections", {"user_id": user_id, "github_user_id": str(profile["id"]), **payload})
        )
        return self._public_connection(connection)

    def list_connections(self, *, user_id: str) -> list[dict[str, Any]]:
        return [self._public_connection(row) for row in self.repository.get_many("github_connections", user_id=user_id, order="created_at.desc")]

    def revoke(self, *, user_id: str, connection_id: str) -> dict[str, Any]:
        row = self.repository.update("github_connections", user_id=user_id, filters={"id": connection_id}, payload={"status": "revoked"})
        return self._public_connection(row)

    def list_repositories(self, *, user_id: str, connection_id: str) -> list[dict[str, Any]]:
        return [self._public_repo(row) for row in self._client(user_id, connection_id).list_repositories() if not row.get("archived") and not row.get("disabled")]

    def list_branches(self, *, user_id: str, connection_id: str, repository: str) -> list[dict[str, Any]]:
        return self._client(user_id, connection_id).get(f"/repos/{repository}/branches?per_page=100")

    def select_repository(self, *, user_id: str, connection_id: str, repository: str) -> dict[str, Any]:
        client = self._client(user_id, connection_id)
        repo = client.get(f"/repos/{repository}")
        permission = str((repo.get("permissions") or {}).get("push") and "push" or "read")
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
            if not (repo.get("permissions") or {}).get("push"):
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
        return {"oauth_enabled": bool(self.oauth_client_id and self.oauth_client_secret and self.oauth_callback_url)}

    def _client(self, user_id: str, connection_id: str) -> GitHubAPIClient:
        connection = self.repository.get_one("github_connections", user_id=user_id, filters={"id": connection_id})
        if connection.get("status") != "active":
            raise ValueError("GitHub connection is not active.")
        return GitHubAPIClient(self.cipher.decrypt(connection["encrypted_access_token"]))

    def _event(self, user_id: str, record: dict[str, Any], event_type: str, error: str | None = None) -> None:
        self.repository.insert("github_pr_events", {"user_id": user_id, "github_pull_request_id": record["id"], "improvement_id": record["improvement_id"], "repository": record["repository"], "branch": record.get("branch_name"), "commit_sha": record.get("commit_sha"), "pr_number": record.get("pr_number"), "pr_url": record.get("pr_url"), "created_by": user_id, "status": record["status"], "event_type": event_type, "error_message": error})

    @staticmethod
    def _artifact(improvement: dict[str, Any], repository: str, branch: str) -> str:
        output = improvement.get("output") or {}
        recommendations = output.get("recommendations") or []
        return "\n".join(["# AdFlow Improvement Brief", "", f"- Improvement ID: `{improvement['id']}`", f"- Repository: `{repository}`", f"- Branch: `{branch}`", f"- Risk: `{improvement.get('risk_level') or 'unknown'}`", "", "## Summary", "", str(output.get("summary") or improvement.get("task") or "Improvement proposal"), "", "## Recommendations", "", *[f"- {item}" for item in recommendations], "", "## Review", "", "This file is generated from an approved Apply Ready improvement and must be reviewed before merge.", ""])

    @staticmethod
    def _public_connection(row: dict[str, Any]) -> dict[str, Any]:
        return {key: value for key, value in row.items() if key != "encrypted_access_token"}

    @staticmethod
    def _public_repo(row: dict[str, Any]) -> dict[str, Any]:
        return {"id": str(row["id"]), "full_name": row["full_name"], "default_branch": row["default_branch"], "permissions": row.get("permissions") or {}, "archived": row.get("archived", False)}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
