from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import unittest
from unittest.mock import Mock

from backend.services.github.github_integration_service import GitHubIntegrationService


class FakeRepository:
    def __init__(self) -> None:
        self.tables = {
            "github_connections": [],
            "github_app_install_sessions": [],
            "github_repository_selections": [],
            "github_pull_requests": [],
            "github_pr_events": [],
            "ai_agent_results": [
                {
                    "id": "improvement-1",
                    "user_id": "user-1",
                    "decision_status": "APPLY_READY",
                    "task": "Improve CTA",
                    "output": {"summary": "Improve CTA", "recommendations": ["Use a clearer CTA"]},
                }
            ],
        }

    def get_one(self, table, *, user_id, filters, **kwargs):
        rows = self.get_many(table, user_id=user_id, filters=filters)
        if not rows:
            raise ValueError(f"{table} record was not found.")
        return rows[0]

    def get_many(self, table, *, user_id, filters=None, limit=None, **kwargs):
        rows = [
            row
            for row in self.tables.get(table, [])
            if row.get("user_id") == user_id
            and all(row.get(key) == value for key, value in (filters or {}).items())
        ]
        return rows[:limit] if limit else rows

    def get_related_many(self, table, *, filters, limit=None, **kwargs):
        rows = [
            row
            for row in self.tables.get(table, [])
            if all(row.get(key) == value for key, value in filters.items())
        ]
        return rows[:limit] if limit else rows

    def insert(self, table, payload):
        row = {"id": f"{table}-{len(self.tables[table]) + 1}", **payload}
        self.tables[table].append(row)
        return row

    def update(self, table, *, user_id, filters, payload):
        for row in self.tables[table]:
            if row.get("user_id") == user_id and all(row.get(key) == value for key, value in filters.items()):
                row.update(payload)
                return row
        return payload


class FakeGitHubClient:
    fail_repository = False
    fail_pull = False
    pull_state = "open"
    pull_merged = False

    def list_repositories(self):
        return self.get("/installation/repositories?per_page=100")["repositories"]

    def get(self, path):
        if path == "/installation/repositories?per_page=100":
            return {"repositories": [{"id": 20, "full_name": "owner/repo", "default_branch": "main", "permissions": {"push": True}}]}
        if path == "/repos/owner/repo" and self.fail_repository:
            raise ValueError("GitHub API GET failed (404)")
        if path == "/repos/owner/repo":
            return {"id": 20, "default_branch": "main", "permissions": {"push": True}}
        if "/git/ref/heads/" in path:
            return {"object": {"sha": "base-sha"}}
        if "/git/commits/" in path:
            return {"tree": {"sha": "base-tree"}}
        if "/pulls/" in path:
            if self.fail_pull:
                raise ValueError("GitHub API GET failed (503)")
            return {"state": self.pull_state, "merged": self.pull_merged}
        raise AssertionError(path)

    def post(self, path, payload):
        if path.endswith("/git/trees"):
            return {"sha": "tree-sha"}
        if path.endswith("/git/commits"):
            return {"sha": "commit-sha"}
        if path.endswith("/git/refs"):
            return {"ref": payload["ref"]}
        if path.endswith("/pulls"):
            return {"number": 7, "html_url": "https://github.com/owner/repo/pull/7"}
        raise AssertionError(path)

    def delete(self, path):
        return {}

    def create_blob(self, repository, content):
        return "blob-sha"


class GitHubIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = FakeRepository()
        self.service = GitHubIntegrationService(
            self.repository,
            app_id="1",
            private_key="test-key",
            client_id="client",
            webhook_secret="webhook-secret",
            callback_url="https://api.example.com/integrations/github/app/callback",
        )
        self.service.auth.get_app = Mock(return_value={"slug": "adflow-test"})
        self.service.auth.get_installation = Mock(
            return_value={
                "id": 42,
                "account": {"id": 10, "login": "octocat", "type": "User"},
                "repository_selection": "selected",
                "permissions": {"contents": "write", "metadata": "read", "pull_requests": "write"},
                "suspended_at": None,
            }
        )
        self.service.auth.installation_client = Mock(return_value=FakeGitHubClient())
        self.service.auth.delete_installation = Mock()
        self.service.auth.create_installation_token = Mock(return_value=Mock(token="short-lived-token"))
        self.service.auth.app_client = Mock(
            return_value=Mock(
                get=Mock(
                    return_value=[
                        {
                            "id": 42,
                            "account": {"id": 10, "login": "octocat", "type": "User"},
                            "repository_selection": "selected",
                            "permissions": {"contents": "write", "metadata": "read", "pull_requests": "write"},
                            "suspended_at": None,
                        }
                    ]
                )
            )
        )

    def _connection(self):
        return self.repository.insert(
            "github_connections",
            {
                "user_id": "user-1",
                "auth_type": "GITHUB_APP",
                "installation_id": 42,
                "github_login": "octocat",
                "account_login": "octocat",
                "status": "active",
            },
        )

    def test_installation_flow_persists_installation_without_token(self):
        started = self.service.start_installation(user_id="user-1")
        state = self.repository.tables["github_app_install_sessions"][0]["state"]
        self.assertIn("/apps/adflow-test/installations/new", started["authorization_url"])
        redirect = self.service.complete_installation(installation_id=42, setup_action="install", state=state)
        connection = self.repository.tables["github_connections"][0]
        self.assertTrue(redirect.endswith("?github=connected"))
        self.assertEqual(connection["installation_id"], 42)
        self.assertIsNone(connection["encrypted_access_token"])

    def test_installation_repository_scope_is_used(self):
        connection = self._connection()
        repositories = self.service.list_repositories(user_id="user-1", connection_id=connection["id"])
        self.assertEqual([row["full_name"] for row in repositories], ["owner/repo"])
        self.service.auth.installation_client.assert_called_once_with(42)

    def test_pending_session_can_claim_single_unlinked_installation(self):
        self.repository.insert(
            "github_app_install_sessions",
            {
                "user_id": "user-1",
                "state": "claim-state",
                "return_path": "/settings",
                "status": "pending",
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        connection = self.service.claim_available_installation(user_id="user-1")
        self.assertEqual(connection["installation_id"], 42)
        self.assertEqual(connection["auth_type"], "GITHUB_APP")
        self.assertEqual(self.repository.tables["github_app_install_sessions"][0]["status"], "completed")

    def test_create_pr_records_commit_and_events(self):
        connection = self._connection()
        selection = self.service.select_repository(user_id="user-1", connection_id=connection["id"], repository="owner/repo")
        result = self.service.create_pull_request(user_id="user-1", improvement_id="improvement-1", repository_selection_id=selection["id"])
        self.assertEqual(result["status"], "OPEN")
        self.assertEqual(result["commit_sha"], "commit-sha")
        self.assertEqual([event["event_type"] for event in self.repository.tables["github_pr_events"]], ["creation_started", "commit_created", "pr_created"])

    def test_legacy_connection_requires_reinstall(self):
        legacy = self.repository.insert("github_connections", {"user_id": "user-1", "auth_type": "LEGACY_TOKEN", "status": "active"})
        with self.assertRaisesRegex(ValueError, "reinstalled"):
            self.service.list_repositories(user_id="user-1", connection_id=legacy["id"])
        self.assertTrue(self.service.list_connections(user_id="user-1")[0]["migration_required"])

    def test_disconnect_deletes_installation(self):
        connection = self._connection()
        revoked = self.service.revoke(user_id="user-1", connection_id=connection["id"])
        self.service.auth.delete_installation.assert_called_once_with(42)
        self.assertEqual(revoked["status"], "revoked")

    def test_expired_install_session_is_rejected(self):
        self.repository.insert(
            "github_app_install_sessions",
            {
                "user_id": "user-1",
                "state": "expired-state",
                "return_path": "/settings",
                "status": "pending",
                "expires_at": (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat(),
            },
        )
        result = self.service.complete_installation(installation_id=42, state="expired-state")
        self.assertTrue(result.endswith("?github=expired"))

    def test_webhook_signature_and_installation_status(self):
        connection = self._connection()
        body = json.dumps({"action": "suspend", "installation": {"id": 42}}).encode()
        signature = "sha256=" + hmac.new(b"webhook-secret", body, hashlib.sha256).hexdigest()
        result = self.service.handle_webhook(body=body, signature=signature, event="installation")
        self.assertTrue(result["accepted"])
        self.assertEqual(connection["status"], "invalid")
        with self.assertRaisesRegex(ValueError, "signature"):
            self.service.handle_webhook(body=body, signature="sha256=bad", event="installation")

    def test_repository_removal_webhook_marks_selection_missing(self):
        connection = self._connection()
        selection = self.repository.insert(
            "github_repository_selections",
            {
                "user_id": "user-1",
                "connection_id": connection["id"],
                "repository_full_name": "owner/repo",
                "status": "active",
            },
        )
        body = json.dumps(
            {
                "installation": {"id": 42},
                "repositories_removed": [{"full_name": "owner/repo"}],
            }
        ).encode()
        signature = "sha256=" + hmac.new(b"webhook-secret", body, hashlib.sha256).hexdigest()
        self.service.handle_webhook(body=body, signature=signature, event="installation_repositories")
        self.assertEqual(selection["status"], "missing")


if __name__ == "__main__":
    unittest.main()
