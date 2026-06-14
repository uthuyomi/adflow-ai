from __future__ import annotations

import unittest

from backend.services.outcomes.improvement_outcome_service import ImprovementOutcomeService


class FakeRepository:
    def __init__(self) -> None:
        self.tables = {
            "ad_projects": [{"id": "project-1", "user_id": "user-1", "name": "SaaS", "description": "saas"}],
            "ad_lp_pairs": [{"id": "pair-1", "user_id": "user-1", "project_id": "project-1"}],
            "ai_agent_results": [{"id": "improvement-1", "user_id": "user-1", "project_id": "project-1", "ad_lp_pair_id": "pair-1", "provider_type": "REAL", "decision_status": "APPLY_READY", "task": "lp_review", "confidence": 0.9, "predicted_effect": {"ctr": 0.1}, "output": {"summary": "Improve CTA"}}],
            "codex_task_prompts": [{"id": "task-1", "user_id": "user-1", "project_id": "project-1", "source_ai_result_id": "improvement-1", "title": "Codex outcome"}],
            "github_pull_requests": [{"id": "pr-1", "user_id": "user-1", "improvement_id": "improvement-1", "codex_task_id": "task-1", "pr_title": "PR outcome", "pr_url": "https://example.com/pr/1", "status": "MERGED"}],
            "codex_task_executions": [{"id": "execution-1", "user_id": "user-1", "task_id": "task-1", "status": "SUCCEEDED", "summary": "Implemented CTA"}],
            "improvement_outcomes": [], "outcome_status_history": [], "outcome_learning_data": [],
            "x_ads_publish_requests": [], "x_ads_metric_snapshots": [],
        }

    def get_many(self, table, *, user_id, filters=None, order=None, limit=None, **kwargs):
        rows = [row for row in self.tables.get(table, []) if row.get("user_id") == user_id and all(row.get(key) == value for key, value in (filters or {}).items())]
        return rows[:limit] if limit else rows

    def get_one(self, table, *, user_id, filters, **kwargs):
        rows = self.get_many(table, user_id=user_id, filters=filters, limit=1)
        if not rows:
            raise ValueError(f"{table} record was not found.")
        return rows[0]

    def insert(self, table, payload):
        row = {"id": f"{table}-{len(self.tables[table]) + 1}", "created_at": "2026-06-13T00:00:00Z", "updated_at": "2026-06-13T00:00:00Z", **payload}
        self.tables[table].append(row)
        if table == "improvement_outcomes":
            self.tables["outcome_status_history"].append({"id": "history-create", "user_id": row["user_id"], "outcome_id": row["id"], "old_status": None, "new_status": row["outcome_status"]})
        return row

    def update(self, table, *, user_id, filters, payload):
        row = self.get_one(table, user_id=user_id, filters=filters)
        old = row.get("outcome_status")
        row.update(payload)
        if table == "improvement_outcomes" and old != row.get("outcome_status"):
            self.tables["outcome_status_history"].append({"id": f"history-{len(self.tables['outcome_status_history']) + 1}", "user_id": user_id, "outcome_id": row["id"], "old_status": old, "new_status": row["outcome_status"]})
        return row

    def create_improvement_outcome(self, payload):
        return self.insert("improvement_outcomes", payload)

    def update_improvement_outcome(self, *, user_id, outcome_id, payload):
        return self.update("improvement_outcomes", user_id=user_id, filters={"id": outcome_id}, payload=payload)

    def get_improvement_outcomes_by_pair(self, *, user_id, pair_id, limit=50):
        return self.get_many("improvement_outcomes", user_id=user_id, filters={"ad_lp_pair_id": pair_id}, limit=limit)

    def get_latest_improvement_outcome_by_pair(self, *, user_id, pair_id):
        return self.get_improvement_outcomes_by_pair(user_id=user_id, pair_id=pair_id, limit=1)[0]

    def get_improvement_outcomes_for_analysis_context(self, *, user_id, pair_id, limit=20):
        return self.get_improvement_outcomes_by_pair(user_id=user_id, pair_id=pair_id, limit=limit)


class Phase5OutcomeLearningTests(unittest.TestCase):
    def setUp(self):
        self.repository = FakeRepository()
        self.service = ImprovementOutcomeService(repository=self.repository)

    def test_measurement_evaluates_success_and_saves_learning(self):
        outcome = self.service.create_from_ai_result(user_id="user-1", result_id="improvement-1")
        measured = self.service.record_measurement(user_id="user-1", outcome_id=outcome["id"], before_metrics={"ctr": 0.02, "cvr": 0.03}, after_metrics={"ctr": 0.024, "cvr": 0.033}, measurement_method="manual", measurement_source="MANUAL", evidence_data=[{"source": "test"}])
        self.assertEqual(measured["outcome_status"], "SUCCESS")
        self.assertGreater(measured["improvement_rate"], 0)
        self.assertEqual(len(self.repository.tables["outcome_learning_data"]), 1)
        context = self.service.get_outcome_context_for_analysis(user_id="user-1", pair_id="pair-1")
        self.assertEqual(context["recommendation_learning"]["summary"]["learning_count"], 1)
        self.assertEqual(len(context["successful_patterns"]), 1)
        self.assertEqual(len(context["recommendation_learning"]["successful_patterns"]), 1)

    def test_failure_is_learning_and_thresholds_are_configurable(self):
        outcome = self.service.create_from_ai_result(user_id="user-1", result_id="improvement-1")
        measured = self.service.record_measurement(user_id="user-1", outcome_id=outcome["id"], before_metrics={"ctr": 0.02}, after_metrics={"ctr": 0.01}, measurement_method="manual", measurement_source="MANUAL", evidence_data=[], thresholds={"failure": -0.1})
        self.assertEqual(measured["outcome_status"], "FAILED")
        self.assertFalse(self.repository.tables["outcome_learning_data"][0]["success_flag"])

    def test_missing_metrics_duplicate_and_invalid_transition_are_rejected(self):
        outcome = self.service.create_from_ai_result(user_id="user-1", result_id="improvement-1")
        with self.assertRaisesRegex(ValueError, "already exists"):
            self.service.create_from_ai_result(user_id="user-1", result_id="improvement-1")
        with self.assertRaisesRegex(ValueError, "Before metrics"):
            self.service.record_measurement(user_id="user-1", outcome_id=outcome["id"], before_metrics={}, after_metrics={"ctr": 1}, measurement_method="manual", measurement_source="MANUAL", evidence_data=[])
        with self.assertRaisesRegex(ValueError, "Invalid outcome status transition"):
            self.service.transition(user_id="user-1", outcome_id=outcome["id"], new_status="SUCCESS", reason="invalid")

    def test_mock_improvement_is_excluded(self):
        self.repository.tables["ai_agent_results"][0]["provider_type"] = "MOCK"
        with self.assertRaisesRegex(ValueError, "Mock"):
            self.service.create_from_ai_result(user_id="user-1", result_id="improvement-1")

    def test_short_measurement_period_is_rejected(self):
        outcome = self.service.create_from_ai_result(user_id="user-1", result_id="improvement-1")
        outcome["measurement_plan"] = {"minimum_days": 7}
        with self.assertRaisesRegex(ValueError, "shorter"):
            self.service.record_measurement(
                user_id="user-1", outcome_id=outcome["id"], before_metrics={"ctr": 1}, after_metrics={"ctr": 2},
                measurement_method="manual", measurement_source="MANUAL", evidence_data=[],
                period={"start_at": "2026-06-01T00:00:00Z", "end_at": "2026-06-02T00:00:00Z"},
            )

    def test_github_pr_and_codex_task_can_create_outcomes(self):
        github_outcome = self.service.create_from_github_pr(user_id="user-1", pull_request_id="pr-1")
        self.assertEqual(github_outcome["source_github_pr_id"], "pr-1")
        self.setUp()
        codex_outcome = self.service.create_from_codex_task(user_id="user-1", task_id="task-1")
        self.assertEqual(codex_outcome["outcome_status"], "PENDING_MEASUREMENT")
        self.assertEqual(codex_outcome["source_codex_task_id"], "task-1")

    def test_connector_failure_and_learning_rebuild_guard(self):
        outcome = self.service.create_from_ai_result(user_id="user-1", result_id="improvement-1")
        with self.assertRaisesRegex(ValueError, "No X Ads"):
            self.service.refresh_from_connector(user_id="user-1", outcome_id=outcome["id"], connector_key="X_ADS")
        with self.assertRaisesRegex(ValueError, "not eligible"):
            self.service.rebuild_learning(user_id="user-1", outcome_id=outcome["id"])

    def test_x_ads_connector_records_linked_snapshot_measurement(self):
        outcome = self.service.create_from_ai_result(user_id="user-1", result_id="improvement-1")
        self.repository.tables["x_ads_publish_requests"].append({
            "id": "publish-1", "user_id": "user-1", "outcome_id": outcome["id"], "created_ad_id": "ad-1",
        })
        self.repository.tables["x_ads_metric_snapshots"].extend([
            {
                "id": "snapshot-1", "user_id": "user-1", "twitter_ad_id": "ad-1",
                "snapshot_date": "2026-06-01", "impressions": 1000, "clicks": 20,
                "conversions": 2, "spend": 20,
            },
            {
                "id": "snapshot-2", "user_id": "user-1", "twitter_ad_id": "ad-1",
                "snapshot_date": "2026-06-08", "impressions": 1200, "clicks": 36,
                "conversions": 5, "spend": 24,
            },
        ])

        measured = self.service.refresh_from_connector(
            user_id="user-1", outcome_id=outcome["id"], connector_key="X_ADS",
        )

        self.assertEqual(measured["outcome_status"], "SUCCESS")
        self.assertEqual(measured["measurement_source"], "X_ADS")
        self.assertEqual(measured["before_metrics"]["ctr"], 0.02)
        self.assertEqual(measured["after_metrics"]["ctr"], 0.03)
        self.assertEqual(len(measured["evidence_data"]), 2)


if __name__ == "__main__":
    unittest.main()
