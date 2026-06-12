from __future__ import annotations

import unittest
from unittest.mock import patch

from backend.core.config import Settings
from backend.services.codex.codex_task_service import CodexTaskService


class FakeRepository:
    def __init__(self) -> None:
        self.tables = {
            "ai_agent_results": [{"id": "improvement-1", "user_id": "user-1", "decision_status": "APPLY_READY", "provider_type": "REAL", "output": {"summary": "Improve CTA"}, "task": "lp_review", "orchestration_run_id": "run-1"}],
            "codex_task_prompts": [], "codex_task_executions": [], "codex_task_status_history": [],
            "ad_projects": [], "ad_lp_pairs": [], "twitter_ads": [], "landing_pages": [], "github_pull_requests": [], "improvement_outcomes": [],
        }
        self.credit_calls = []

    def get_one(self, table, *, user_id, filters, **kwargs):
        rows = self.get_many(table, user_id=user_id, filters=filters)
        if not rows:
            raise ValueError(f"{table} record was not found.")
        return rows[0]

    def get_many(self, table, *, user_id, filters=None, order=None, limit=None, **kwargs):
        rows = [row for row in self.tables.get(table, []) if row.get("user_id") == user_id and all(row.get(k) in v if isinstance(v, list) else row.get(k) == v for k, v in (filters or {}).items())]
        return rows[:limit] if limit else rows

    def insert(self, table, payload):
        row = {"id": f"{table}-{len(self.tables[table]) + 1}", "created_at": "2026-06-13T00:00:00Z", **payload}
        self.tables[table].append(row)
        return row

    def update(self, table, *, user_id, filters, payload):
        for row in self.tables[table]:
            if row.get("user_id") == user_id and all(row.get(k) == v for k, v in filters.items()):
                row.update(payload)
                return row
        return payload

    def rpc(self, name, payload):
        self.credit_calls.append((name, payload))
        return {"monthly_credits": 1000, "purchased_credits": 0, "lifetime_used_credits": 0}


class CodexWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.repository = FakeRepository()
        self.service = CodexTaskService(repository=self.repository, settings=Settings())

    def test_create_and_manual_execution_persist_state_and_history(self):
        task = self.service.create_task(user_id="user-1", improvement_id="improvement-1", idempotency_key="create-1")
        result = self.service.execute_manual(user_id="user-1", task_id=task["id"], idempotency_key="manual-1", summary="Implemented", stdout="ok", stderr=None, files_changed=[{"path": "file.txt", "content": "done"}], diff_summary="1 file", succeeded=True)
        self.assertEqual(result["task"]["status"], "SUCCEEDED")
        self.assertEqual(result["execution"]["execution_mode"], "MANUAL_EXECUTION")
        self.assertEqual([row["new_status"] for row in self.repository.tables["codex_task_status_history"]], ["CREATED", "QUEUED", "RUNNING", "SUCCEEDED"])

    def test_failed_execution_refunds_and_can_retry(self):
        task = self.service.create_task(user_id="user-1", improvement_id="improvement-1", idempotency_key="create-1")
        failed = self.service.execute_manual(user_id="user-1", task_id=task["id"], idempotency_key="manual-fail", summary="Failed", stdout=None, stderr="error", files_changed=[], diff_summary=None, succeeded=False, error_code="TEST")
        failed_status = failed["task"]["status"]
        retried = self.service.execute_manual(user_id="user-1", task_id=task["id"], idempotency_key="manual-retry", summary="Succeeded", stdout="ok", stderr=None, files_changed=[], diff_summary=None, succeeded=True)
        self.assertEqual(failed_status, "FAILED")
        self.assertEqual(retried["task"]["status"], "SUCCEEDED")
        self.assertTrue(any(name == "refund_consumed_credits_idempotent" for name, _ in self.repository.credit_calls))

    def test_mock_execution_is_rejected_and_created_task_can_cancel(self):
        task = self.service.create_task(user_id="user-1", improvement_id="improvement-1", idempotency_key="create-1")
        with self.assertRaisesRegex(ValueError, "MOCK"):
            self.service._begin_execution(user_id="user-1", task_id=task["id"], mode="MOCK", idempotency_key="mock-1")
        cancelled = self.service.cancel(user_id="user-1", task_id=task["id"], reason="No longer needed")
        self.assertEqual(cancelled["status"], "CANCELLED")

    def test_duplicate_task_and_execution_are_idempotent(self):
        first = self.service.create_task(user_id="user-1", improvement_id="improvement-1", idempotency_key="create-1")
        second = self.service.create_task(user_id="user-1", improvement_id="improvement-1", idempotency_key="create-2")
        self.assertEqual(first["id"], second["id"])
        one = self.service.execute_manual(user_id="user-1", task_id=first["id"], idempotency_key="manual-1", summary="Done", stdout=None, stderr=None, files_changed=[], diff_summary=None)
        two = self.service.execute_manual(user_id="user-1", task_id=first["id"], idempotency_key="manual-1", summary="Done again", stdout=None, stderr=None, files_changed=[], diff_summary=None)
        self.assertEqual(one["execution"]["id"], two["execution"]["id"])

    def test_running_task_cancel_updates_execution_and_refunds(self):
        task = self.service.create_task(user_id="user-1", improvement_id="improvement-1", idempotency_key="create-1")
        task["status"] = "RUNNING"
        execution = self.repository.insert("codex_task_executions", {"task_id": task["id"], "user_id": "user-1", "execution_mode": "REAL_EXECUTION", "status": "RUNNING", "idempotency_key": "running-1", "operator_user_id": "user-1"})
        cancelled = self.service.cancel(user_id="user-1", task_id=task["id"], reason="Stop execution")
        self.assertEqual(cancelled["status"], "CANCELLED")
        self.assertEqual(execution["status"], "CANCELLED")
        self.assertTrue(any(name == "refund_consumed_credits_idempotent" for name, _ in self.repository.credit_calls))

    @patch("backend.services.codex.codex_task_service.GitHubIntegrationService")
    def test_pr_failure_refunds_and_keeps_task_retryable(self, github):
        task = self.service.create_task(user_id="user-1", improvement_id="improvement-1", idempotency_key="create-1")
        task["status"] = "SUCCEEDED"
        execution = self.repository.insert("codex_task_executions", {"task_id": task["id"], "user_id": "user-1", "execution_mode": "MANUAL_EXECUTION", "status": "SUCCEEDED", "idempotency_key": "manual-1", "operator_user_id": "user-1", "files_changed": [{"path": "file.txt", "content": "done"}]})
        github.return_value.create_pull_request.side_effect = ValueError("GitHub unavailable")
        with self.assertRaisesRegex(ValueError, "GitHub unavailable"):
            self.service.create_pr(user_id="user-1", task_id=task["id"], execution_id=execution["id"], repository_selection_id="selection-1", idempotency_key="pr-1")
        self.assertEqual(task["status"], "SUCCEEDED")
        self.assertTrue(any(payload["p_idempotency_key"] == "refund:codex-pr:pr-1" for name, payload in self.repository.credit_calls if name == "refund_consumed_credits_idempotent"))

    @patch("backend.services.codex.codex_task_service.ImprovementOutcomeService")
    def test_outcome_failure_refunds(self, outcome):
        task = self.service.create_task(user_id="user-1", improvement_id="improvement-1", idempotency_key="create-1")
        task["status"] = "SUCCEEDED"
        outcome.return_value.create_from_codex_task.side_effect = ValueError("Outcome unavailable")
        with self.assertRaisesRegex(ValueError, "Outcome unavailable"):
            self.service.create_outcome(user_id="user-1", task_id=task["id"], idempotency_key="outcome-1")
        self.assertTrue(any(payload["p_idempotency_key"] == "refund:codex-outcome:outcome-1" for name, payload in self.repository.credit_calls if name == "refund_consumed_credits_idempotent"))

    def test_real_execution_configuration_is_explicit(self):
        configuration = self.service.configuration()
        self.assertFalse(configuration["real_execution_enabled"])
        self.assertTrue(configuration["manual_execution_enabled"])
        self.assertFalse(configuration["mock_execution_enabled"])


if __name__ == "__main__":
    unittest.main()
