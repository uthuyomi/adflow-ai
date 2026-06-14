from __future__ import annotations

import unittest

from backend.services.ai.providers.mock_provider import MockProvider
from backend.services.ai.provider_registry import AIProviderRegistry
from backend.core.config import Settings
from backend.services.demand.outcome_feedback_learning import OutcomeFeedbackLearning
from backend.services.demand.demand_intelligence_service import _data_source_type
from backend.services.orchestration.ai_orchestrator import AIOrchestrator, RuleBasedAIRouter


class FakeRepository:
    def __init__(self) -> None:
        self.rows: dict[str, list[dict]] = {"ai_agent_scorecards": []}

    def get_many(self, table: str, **kwargs):
        rows = self.rows.get(table, [])
        filters = kwargs.get("filters") or {}
        return [row for row in rows if all(row.get(key) == value for key, value in filters.items())]

    def insert(self, table: str, payload: dict):
        row = {"id": f"{table}-1", **payload}
        self.rows.setdefault(table, []).append(row)
        return row

    def update(self, table: str, **kwargs):
        return kwargs["payload"]


class Phase1TrustTests(unittest.TestCase):
    def test_mock_provider_returns_explicit_source_metadata(self) -> None:
        result = MockProvider().generate_structured(
            system_prompt="test",
            user_payload={"task": "analysis", "provider": "openai", "failure_reason": "OpenAI failed"},
            schema={},
        )
        self.assertEqual(result["provider_type"], "MOCK")
        self.assertEqual(result["source_provider"], "openai")
        self.assertEqual(result["failure_reason"], "OpenAI failed")

    def test_mock_results_do_not_update_scorecards(self) -> None:
        repository = FakeRepository()
        orchestrator = AIOrchestrator(repository=repository)
        orchestrator._update_scorecard(
            user_id="user-1",
            inserted={
                "id": "result-1",
                "provider_type": "MOCK",
                "score": 90,
                "agent_key": "agent",
                "provider": "openai",
            },
            platform="x",
            metric="ctr_fit",
        )
        self.assertEqual(repository.rows["ai_agent_scorecards"], [])

    def test_mock_sourced_outcomes_are_excluded_from_learning(self) -> None:
        links, summary = OutcomeFeedbackLearning().build(
            clusters=[],
            outcomes=[
                {"id": "mock", "source_provider_type": "MOCK", "outcome_status": "positive"},
                {"id": "real", "source_provider_type": "REAL", "outcome_status": "positive"},
            ],
            search_signals=[],
            market_estimates=[],
            locale="en",
        )
        self.assertEqual([link["outcome_id"] for link in links], ["real"])
        self.assertEqual(summary["linked_outcome_count"], 1)

    def test_demand_source_type_is_explicit_and_conservative(self) -> None:
        self.assertEqual(_data_source_type("firecrawl"), "REAL")
        self.assertEqual(_data_source_type("synthetic"), "SYNTHETIC")
        self.assertEqual(_data_source_type(None), "SYNTHETIC")

    def test_codex_provider_never_falls_back_to_mock(self) -> None:
        provider = AIProviderRegistry(Settings()).get("codex")
        with self.assertRaisesRegex(ValueError, "MockProvider is not allowed"):
            provider.generate_structured(system_prompt="test", user_payload={}, schema={})

    def test_codex_is_not_executed_during_proposal_orchestration(self) -> None:
        route = RuleBasedAIRouter().route(
            platform="twitter",
            objective="pair_analysis_with_review_and_diff_readiness",
        )
        self.assertFalse(any(step.provider == "codex" for step in route))


if __name__ == "__main__":
    unittest.main()
