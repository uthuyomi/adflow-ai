from __future__ import annotations

from datetime import datetime, timedelta, timezone
import unittest
from unittest.mock import patch

from cryptography.fernet import Fernet

from backend.services.github.github_integration_service import GitHubIntegrationService


class FakeRepository:
    def __init__(self) -> None:
        self.tables = {
            "github_connections": [],
            "github_oauth_sessions": [],
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

    def get_many(self, table, *, user_id, filters=None, **kwargs):
        return [
            row
            for row in self.tables.get(table, [])
            if row.get("user_id") == user_id and all(row.get(key) == value for key, value in (filters or {}).items())
        ]

    def get_related_many(self, table, *, filters, **kwargs):
        return [row for row in self.tables.get(table, []) if all(row.get(key) == value for key, value in filters.items())]

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

    def __init__(self, token):
        self.token = token

    def get(self, path):
        if path == "/user":
            return {"id": 10, "login": "octocat"}
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

    def create_blob(self, repository, content):
        return "blob-sha"


class GitHubIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = FakeRepository()
        self.service = GitHubIntegrationService(self.repository, Fernet.generate_key().decode())

    @patch("backend.services.github.github_integration_service.GitHubAPIClient", FakeGitHubClient)
    def test_reconnect_updates_existing_connection(self):
        first = self.service.connect_token(user_id="user-1", token="token-one")
        self.service.revoke(user_id="user-1", connection_id=first["id"])
        second = self.service.connect_token(user_id="user-1", token="token-two")
        self.assertEqual(first["id"], second["id"])
        self.assertEqual(second["status"], "active")
        self.assertEqual(len(self.repository.tables["github_connections"]), 1)

    @patch("backend.services.github.github_integration_service.GitHubAPIClient", FakeGitHubClient)
    def test_create_pr_records_commit_and_pr_events(self):
        connection = self.service.connect_token(user_id="user-1", token="token")
        selection = self.service.select_repository(user_id="user-1", connection_id=connection["id"], repository="owner/repo")
        result = self.service.create_pull_request(user_id="user-1", improvement_id="improvement-1", repository_selection_id=selection["id"])
        self.assertEqual(result["status"], "OPEN")
        self.assertEqual(result["commit_sha"], "commit-sha")
        self.assertEqual([event["event_type"] for event in self.repository.tables["github_pr_events"]], ["creation_started", "commit_created", "pr_created"])

    @patch("backend.services.github.github_integration_service.GitHubAPIClient", FakeGitHubClient)
    def test_missing_repository_persists_failed_record(self):
        connection = self.service.connect_token(user_id="user-1", token="token")
        selection = self.service.select_repository(user_id="user-1", connection_id=connection["id"], repository="owner/repo")
        FakeGitHubClient.fail_repository = True
        try:
            with self.assertRaisesRegex(ValueError, "404"):
                self.service.create_pull_request(user_id="user-1", improvement_id="improvement-1", repository_selection_id=selection["id"])
        finally:
            FakeGitHubClient.fail_repository = False
        self.assertEqual(self.repository.tables["github_pull_requests"][0]["status"], "FAILED")
        self.assertEqual(self.repository.tables["github_pr_events"][-1]["event_type"], "creation_failed")

    @patch("backend.services.github.github_integration_service.GitHubAPIClient", FakeGitHubClient)
    def test_sync_maps_open_closed_and_merged_states(self):
        connection = self.service.connect_token(user_id="user-1", token="token")
        selection = self.service.select_repository(user_id="user-1", connection_id=connection["id"], repository="owner/repo")
        pull_request = self.service.create_pull_request(user_id="user-1", improvement_id="improvement-1", repository_selection_id=selection["id"])
        FakeGitHubClient.pull_state = "closed"
        closed = self.service.sync(user_id="user-1", pull_request_id=pull_request["id"])
        closed_status = closed["status"]
        FakeGitHubClient.pull_merged = True
        merged = self.service.sync(user_id="user-1", pull_request_id=pull_request["id"])
        FakeGitHubClient.pull_state = "open"
        FakeGitHubClient.pull_merged = False
        self.assertEqual(closed_status, "CLOSED")
        self.assertEqual(merged["status"], "MERGED")

    @patch("backend.services.github.github_integration_service.GitHubAPIClient", FakeGitHubClient)
    def test_sync_failure_is_persisted_and_global_sync_continues(self):
        connection = self.service.connect_token(user_id="user-1", token="token")
        selection = self.service.select_repository(user_id="user-1", connection_id=connection["id"], repository="owner/repo")
        pull_request = self.service.create_pull_request(user_id="user-1", improvement_id="improvement-1", repository_selection_id=selection["id"])
        FakeGitHubClient.fail_pull = True
        try:
            result = self.service.sync_all_tracked()
        finally:
            FakeGitHubClient.fail_pull = False
        self.assertEqual(result, {"total": 1, "synced": 0, "failed": 1})
        self.assertIn("503", pull_request["error_message"])
        self.assertEqual(self.repository.tables["github_pr_events"][-1]["event_type"], "sync_failed")

    @patch("backend.services.github.github_integration_service.GitHubAPIClient", FakeGitHubClient)
    def test_global_sync_detects_reopened_closed_pr(self):
        connection = self.service.connect_token(user_id="user-1", token="token")
        selection = self.service.select_repository(user_id="user-1", connection_id=connection["id"], repository="owner/repo")
        pull_request = self.service.create_pull_request(user_id="user-1", improvement_id="improvement-1", repository_selection_id=selection["id"])
        pull_request["status"] = "CLOSED"
        FakeGitHubClient.pull_state = "open"
        result = self.service.sync_all_tracked()
        self.assertEqual(result, {"total": 1, "synced": 1, "failed": 0})
        self.assertEqual(pull_request["status"], "OPEN")

    @patch("backend.services.github.github_integration_service.GitHubAPIClient", FakeGitHubClient)
    def test_global_sync_skips_revoked_connections(self):
        connection = self.service.connect_token(user_id="user-1", token="token")
        selection = self.service.select_repository(user_id="user-1", connection_id=connection["id"], repository="owner/repo")
        self.service.create_pull_request(user_id="user-1", improvement_id="improvement-1", repository_selection_id=selection["id"])
        self.service.revoke(user_id="user-1", connection_id=connection["id"])
        self.assertEqual(self.service.sync_all_tracked(), {"total": 0, "synced": 0, "failed": 0})

    def test_configuration_reports_oauth_availability(self):
        self.assertFalse(self.service.configuration()["oauth_enabled"])
        self.service.oauth_client_id = "client"
        self.service.oauth_client_secret = "secret"
        self.service.oauth_callback_url = "https://example.com/callback"
        self.assertTrue(self.service.configuration()["oauth_enabled"])

    def test_expired_oauth_session_is_rejected(self):
        self.service.oauth_client_id = "client"
        self.service.oauth_client_secret = "secret"
        self.repository.insert(
            "github_oauth_sessions",
            {
                "user_id": "user-1",
                "state": "expired-state",
                "return_path": "/settings",
                "status": "pending",
                "expires_at": (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat(),
            },
        )
        result = self.service.complete_oauth(code="code", state="expired-state")
        self.assertTrue(result.endswith("?github=expired"))
        self.assertEqual(self.repository.tables["github_oauth_sessions"][0]["status"], "expired")


if __name__ == "__main__":
    unittest.main()
