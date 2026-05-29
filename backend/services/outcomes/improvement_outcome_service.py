from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.services.supabase.supabase_repository import SupabaseRepository

OUTCOME_STATUSES = {"pending", "implemented", "measured", "positive", "neutral", "negative", "inconclusive"}
METRIC_KEYS = ("impressions", "clicks", "conversions", "spend", "ctr", "cpc", "cvr", "bounce_rate", "session_duration", "scroll_depth")


class ImprovementOutcomeService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository

    def create_outcome(
        self,
        *,
        user_id: str,
        project_id: str | None,
        ad_lp_pair_id: str,
        title: str,
        description: str | None = None,
        source_ai_result_id: str | None = None,
        source_codex_task_id: str | None = None,
        before_metrics: dict[str, Any] | None = None,
        after_metrics: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not title.strip():
            raise ValueError("title is required.")
        self.repository.get_one("ad_lp_pairs", user_id=user_id, filters={"id": ad_lp_pair_id})
        before = before_metrics or {}
        after = after_metrics or {}
        delta = self.calculate_metric_delta(before, after)
        status = self._status_from_metrics(before, after, "pending")
        return self.repository.create_improvement_outcome(
            {
                "user_id": user_id,
                "project_id": project_id,
                "ad_lp_pair_id": ad_lp_pair_id,
                "source_ai_result_id": source_ai_result_id,
                "source_codex_task_id": source_codex_task_id,
                "title": title.strip(),
                "description": description,
                "before_metrics": before,
                "after_metrics": after,
                "metric_delta": delta,
                "outcome_status": status,
                "outcome_summary": self.summarize_outcome(before, after, delta, status) if after else None,
            },
        )

    def create_from_ai_result(self, *, user_id: str, result_id: str) -> dict[str, Any]:
        result = self.repository.get_one("ai_agent_results", user_id=user_id, filters={"id": result_id})
        if result.get("decision_status") != "apply_ready":
            raise ValueError("AI result must be apply_ready before creating an outcome draft.")
        output = result.get("output") or {}
        title = str(output.get("summary") or result.get("task") or "Improvement outcome draft")[:100]
        return self.create_outcome(
            user_id=user_id,
            project_id=result.get("project_id"),
            ad_lp_pair_id=result["ad_lp_pair_id"],
            source_ai_result_id=result_id,
            title=title,
            description=f"Draft outcome created from AI result {result_id}.",
        )

    def create_from_codex_task(self, *, user_id: str, task_id: str) -> dict[str, Any]:
        task = self.repository.get_one("codex_task_prompts", user_id=user_id, filters={"id": task_id})
        source_result_id = task.get("source_ai_result_id")
        result = self.repository.get_one("ai_agent_results", user_id=user_id, filters={"id": source_result_id}) if source_result_id else None
        pair_id = result.get("ad_lp_pair_id") if result else None
        if not pair_id:
            raise ValueError("Codex task is not linked to an ad LP pair.")
        return self.create_outcome(
            user_id=user_id,
            project_id=task.get("project_id"),
            ad_lp_pair_id=pair_id,
            source_ai_result_id=source_result_id,
            source_codex_task_id=task_id,
            title=str(task.get("title") or "Codex task outcome")[:100],
            description="Draft outcome created from Codex task prompt.",
        )

    def get_outcomes_for_pair(self, *, user_id: str, pair_id: str) -> list[dict[str, Any]]:
        return self.repository.get_improvement_outcomes_by_pair(user_id=user_id, pair_id=pair_id)

    def get_latest_outcome_for_pair(self, *, user_id: str, pair_id: str) -> dict[str, Any]:
        return self.repository.get_latest_improvement_outcome_by_pair(user_id=user_id, pair_id=pair_id)

    def update_outcome(self, *, user_id: str, outcome_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        current = self.repository.get_one("improvement_outcomes", user_id=user_id, filters={"id": outcome_id})
        before = payload.get("before_metrics", current.get("before_metrics") or {})
        after = payload.get("after_metrics", current.get("after_metrics") or {})
        requested_status = payload.get("outcome_status", current.get("outcome_status") or "pending")
        if requested_status not in OUTCOME_STATUSES:
            raise ValueError("Invalid outcome_status.")
        delta = self.calculate_metric_delta(before, after)
        status = self._status_from_metrics(before, after, requested_status)
        update_payload = {
            **{key: value for key, value in payload.items() if value is not None},
            "before_metrics": before,
            "after_metrics": after,
            "metric_delta": delta,
            "outcome_status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if not update_payload.get("outcome_summary"):
            update_payload["outcome_summary"] = self.summarize_outcome(before, after, delta, status)
        return self.repository.update_improvement_outcome(user_id=user_id, outcome_id=outcome_id, payload=update_payload)

    def get_outcome_context_for_analysis(self, *, user_id: str, pair_id: str) -> dict[str, Any]:
        outcomes = self.repository.get_improvement_outcomes_for_analysis_context(user_id=user_id, pair_id=pair_id)
        successful = [item for item in outcomes if item.get("outcome_status") == "positive"]
        failed = [item for item in outcomes if item.get("outcome_status") == "negative"]
        inconclusive = [item for item in outcomes if item.get("outcome_status") in {"neutral", "inconclusive"}]
        return {
            "recent_outcomes": outcomes,
            "successful_patterns": [self._pattern(item) for item in successful],
            "failed_patterns": [self._pattern(item) for item in failed],
            "inconclusive_patterns": [self._pattern(item) for item in inconclusive],
        }

    @staticmethod
    def calculate_metric_delta(before_metrics: dict[str, Any], after_metrics: dict[str, Any]) -> dict[str, Any]:
        delta: dict[str, Any] = {}
        for key in METRIC_KEYS:
            before = _number(before_metrics.get(key))
            after = _number(after_metrics.get(key))
            if before is None or after is None:
                continue
            delta[f"{key}_delta"] = round(after - before, 6)
            delta[f"{key}_delta_rate"] = round((after - before) / before, 6) if before else None
        return delta

    @staticmethod
    def summarize_outcome(before_metrics: dict[str, Any], after_metrics: dict[str, Any], delta: dict[str, Any], status: str) -> str:
        if not before_metrics or not after_metrics:
            return "Before/after metrics are incomplete, so the outcome remains a measurement draft."
        ctr_delta = _number(delta.get("ctr_delta"))
        cvr_delta = _number(delta.get("cvr_delta"))
        bounce_delta = _number(delta.get("bounce_rate_delta"))
        parts = []
        if ctr_delta is not None:
            parts.append(f"CTR changed by {ctr_delta}.")
        if cvr_delta is not None:
            parts.append(f"CVR changed by {cvr_delta}.")
        if bounce_delta is not None:
            parts.append(f"Bounce rate changed by {bounce_delta}.")
        qualifier = {
            "positive": "The measured direction is positive, but continued validation is still needed.",
            "neutral": "The result is mixed, so the change should be treated as a tentative learning.",
            "negative": "The measured direction is unfavorable, so avoid repeating this pattern without a new hypothesis.",
            "inconclusive": "The data is not sufficient for a strong conclusion.",
            "measured": "The result has been measured and should be reviewed before labeling.",
        }.get(status, "The outcome is still pending measurement.")
        return " ".join([*parts, qualifier]).strip()

    @staticmethod
    def _status_from_metrics(before: dict[str, Any], after: dict[str, Any], fallback: str) -> str:
        if not before or not after:
            return fallback if fallback in {"pending", "implemented"} else "inconclusive"
        ctr_delta = _number(after.get("ctr")) or 0
        ctr_delta -= _number(before.get("ctr")) or 0
        cvr_delta = _number(after.get("cvr")) or 0
        cvr_delta -= _number(before.get("cvr")) or 0
        if ctr_delta > 0 and cvr_delta >= 0:
            return "positive"
        if ctr_delta > 0 and cvr_delta < 0:
            return "neutral"
        if ctr_delta < 0 and cvr_delta < 0:
            return "negative"
        return "inconclusive" if fallback in {"measured", "positive", "neutral", "negative"} else fallback

    @staticmethod
    def _pattern(outcome: dict[str, Any]) -> dict[str, Any]:
        return {
            "title": outcome.get("title"),
            "status": outcome.get("outcome_status"),
            "metric_delta": outcome.get("metric_delta") or {},
            "summary": outcome.get("outcome_summary"),
            "learning_notes": outcome.get("learning_notes"),
        }


def _number(value: Any) -> float | None:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None
