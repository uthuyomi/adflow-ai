from __future__ import annotations

import unittest

from backend.services.improvements.improvement_workflow_service import ImprovementWorkflowService


class FakeRepository:
    def __init__(self) -> None:
        self.tables = {
            "ai_agent_results": [
                {
                    "id": "improvement-1",
                    "user_id": "user-1",
                    "decision_status": "GENERATED",
                    "agent_key": "growth",
                    "provider": "openai",
                    "task": "ad_improvement",
                    "output": {"summary": "Improve CTA"},
                    "confidence": 80,
                    "created_at": "2026-06-12T00:00:00Z",
                    "project_id": "project-1",
                    "ad_lp_pair_id": "pair-1",
                    "orchestration_run_id": "run-1",
                }
            ],
            "improvement_status_history": [],
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

    def update(self, table, *, user_id, filters, payload):
        for row in self.tables[table]:
            if row.get("user_id") == user_id and all(row.get(key) == value for key, value in filters.items()):
                old_status = row["decision_status"]
                row.update(payload)
                self.tables["improvement_status_history"].append(
                    {
                        "id": f"history-{len(self.tables['improvement_status_history']) + 1}",
                        "user_id": user_id,
                        "improvement_id": row["id"],
                        "old_status": old_status,
                        "new_status": row["decision_status"],
                        "changed_by": payload["updated_by"],
                        "changed_at": payload["status_updated_at"],
                        "reason": payload["decision_reason"],
                    }
                )
                return row
        return payload


class ImprovementWorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = FakeRepository()
        self.service = ImprovementWorkflowService(self.repository)

    def test_approve_then_apply_ready_persists_and_logs(self) -> None:
        approved = self.service.transition(
            user_id="user-1", improvement_id="improvement-1", new_status="APPROVED", reason="Reviewed"
        )
        ready = self.service.transition(
            user_id="user-1", improvement_id="improvement-1", new_status="APPLY_READY", reason="Ready for GitHub"
        )
        self.assertEqual(approved["updated_by"], "user-1")
        self.assertEqual(ready["decision_status"], "APPLY_READY")
        self.assertEqual(ready["apply_ready_metadata"]["source_ai_result_id"], "improvement-1")
        self.assertEqual(len(self.repository.tables["improvement_status_history"]), 2)

    def test_reject_requires_reason_and_is_terminal(self) -> None:
        with self.assertRaisesRegex(ValueError, "reason"):
            self.service.transition(user_id="user-1", improvement_id="improvement-1", new_status="REJECTED")
        rejected = self.service.transition(
            user_id="user-1", improvement_id="improvement-1", new_status="REJECTED", reason="Unsupported claim"
        )
        self.assertEqual(rejected["decision_reason"], "Unsupported claim")
        with self.assertRaisesRegex(ValueError, "Invalid"):
            self.service.transition(user_id="user-1", improvement_id="improvement-1", new_status="APPROVED")

    def test_invalid_transition_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "Invalid"):
            self.service.transition(user_id="user-1", improvement_id="improvement-1", new_status="APPLY_READY")

    def test_stats_and_search_use_persisted_results(self) -> None:
        stats = self.service.stats(user_id="user-1")
        found = self.service.list_improvements(user_id="user-1", search="cta")
        self.assertEqual(stats["total"], 1)
        self.assertEqual(stats["counts"]["GENERATED"], 1)
        self.assertEqual([item["id"] for item in found], ["improvement-1"])


if __name__ == "__main__":
    unittest.main()
