from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from backend.services.outcomes.outcome_connectors import OutcomeConnectorRegistry
from backend.services.outcomes.outcome_learning_engine import OutcomeLearningEngine, TERMINAL_OUTCOME_STATUSES
from backend.services.supabase.supabase_repository import SupabaseRepository

OUTCOME_STATUSES = ("DRAFT", "PENDING_MEASUREMENT", "MEASURING", "SUCCESS", "PARTIAL_SUCCESS", "NO_IMPACT", "FAILED", "ARCHIVED")
ALLOWED_TRANSITIONS = {
    "DRAFT": {"PENDING_MEASUREMENT", "ARCHIVED"},
    "PENDING_MEASUREMENT": {"MEASURING", "ARCHIVED"},
    "MEASURING": {"SUCCESS", "PARTIAL_SUCCESS", "NO_IMPACT", "FAILED", "ARCHIVED"},
    "FAILED": {"MEASURING", "ARCHIVED"},
    "SUCCESS": {"ARCHIVED"},
    "PARTIAL_SUCCESS": {"ARCHIVED"},
    "NO_IMPACT": {"ARCHIVED"},
    "ARCHIVED": set(),
}
METRIC_KEYS = ("impressions", "clicks", "conversions", "conversion", "revenue", "traffic", "retention", "spend", "ctr", "cpc", "cpa", "cvr", "bounce_rate", "session_duration", "scroll_depth")
LOWER_IS_BETTER = {"cpc", "cpa", "spend", "bounce_rate"}
DEFAULT_THRESHOLDS = {"success": 0.05, "partial_success": 0.01, "failure": -0.05}


class ImprovementOutcomeService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository
        self.learning = OutcomeLearningEngine(repository)
        self.connectors = OutcomeConnectorRegistry(repository)

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
        source_github_pr_id: str | None = None,
        before_metrics: dict[str, Any] | None = None,
        after_metrics: dict[str, Any] | None = None,
        expected_impact: dict[str, Any] | None = None,
        measurement_plan: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not title.strip():
            raise ValueError("title is required.")
        self.repository.get_one("ad_lp_pairs", user_id=user_id, filters={"id": ad_lp_pair_id})
        self._prevent_duplicate(user_id, source_ai_result_id, source_codex_task_id, source_github_pr_id)
        outcome = self.repository.create_improvement_outcome({
            "user_id": user_id, "project_id": project_id, "ad_lp_pair_id": ad_lp_pair_id,
            "source_ai_result_id": source_ai_result_id, "source_codex_task_id": source_codex_task_id,
            "source_github_pr_id": source_github_pr_id, "title": title.strip(), "description": description,
            "summary": description, "expected_impact": expected_impact or {}, "expected_metrics": expected_impact or {},
            "measurement_plan": measurement_plan or {}, "before_metrics": before_metrics or {}, "after_metrics": after_metrics or {}, "metric_delta": self.calculate_metric_delta(before_metrics or {}, after_metrics or {}),
            "outcome_status": "DRAFT", "created_by": user_id, "measurement_source": "MANUAL",
        })
        if before_metrics and after_metrics:
            outcome = self.record_measurement(user_id=user_id, outcome_id=outcome["id"], before_metrics=before_metrics or {}, after_metrics=after_metrics or {}, measurement_method="Initial manual measurement", measurement_source="MANUAL", evidence_data=[])
        return outcome

    def create_from_ai_result(self, *, user_id: str, result_id: str) -> dict[str, Any]:
        result = self.repository.get_one("ai_agent_results", user_id=user_id, filters={"id": result_id})
        if result.get("decision_status") != "APPLY_READY":
            raise ValueError("AI result must be APPLY_READY before creating an outcome.")
        if result.get("provider_type") != "REAL":
            raise ValueError("Mock AI results cannot create learning outcomes.")
        output = result.get("output") or {}
        return self.create_outcome(
            user_id=user_id, project_id=result.get("project_id"), ad_lp_pair_id=result["ad_lp_pair_id"],
            source_ai_result_id=result_id, title=str(output.get("summary") or result.get("task") or "Improvement outcome")[:100],
            description=f"Outcome created from improvement {result_id}.", expected_impact=result.get("predicted_effect") or {},
            measurement_plan={"primary_metrics": ["ctr", "cvr"], "source": "MANUAL"},
        )

    def create_from_codex_task(self, *, user_id: str, task_id: str) -> dict[str, Any]:
        task = self.repository.get_one("codex_task_prompts", user_id=user_id, filters={"id": task_id})
        result = self.repository.get_one("ai_agent_results", user_id=user_id, filters={"id": task["source_ai_result_id"]})
        if result.get("provider_type") != "REAL":
            raise ValueError("Codex tasks sourced from mock AI results cannot create learning outcomes.")
        executions = self.repository.get_many("codex_task_executions", user_id=user_id, filters={"task_id": task_id, "status": "SUCCEEDED"}, order="created_at.desc", limit=1)
        prs = self.repository.get_many("github_pull_requests", user_id=user_id, filters={"codex_task_id": task_id}, order="created_at.desc", limit=1)
        execution, pr = (executions[0] if executions else {}), (prs[0] if prs else {})
        outcome = self.create_outcome(
            user_id=user_id, project_id=task.get("project_id"), ad_lp_pair_id=result["ad_lp_pair_id"],
            source_ai_result_id=result["id"], source_codex_task_id=task_id, source_github_pr_id=pr.get("id"),
            title=str(task.get("title") or "Codex task outcome")[:100],
            description=f"Codex implementation result: {execution.get('summary') or 'No execution summary.'}",
            expected_impact=result.get("predicted_effect") or {},
            measurement_plan={"primary_metrics": ["ctr", "cvr"], "source": "MANUAL", "measurement_days": 7},
        )
        return self.transition(user_id=user_id, outcome_id=outcome["id"], new_status="PENDING_MEASUREMENT", reason="Codex implementation is ready for measurement", payload={
            "measurement_scheduled_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "related_pr_url": pr.get("pr_url"), "implementation_summary": execution.get("summary"),
        })

    def create_from_github_pr(self, *, user_id: str, pull_request_id: str) -> dict[str, Any]:
        pr = self.repository.get_one("github_pull_requests", user_id=user_id, filters={"id": pull_request_id})
        improvement = self.repository.get_one("ai_agent_results", user_id=user_id, filters={"id": pr["improvement_id"]})
        return self.create_outcome(
            user_id=user_id, project_id=improvement.get("project_id"), ad_lp_pair_id=improvement["ad_lp_pair_id"],
            source_ai_result_id=improvement["id"], source_codex_task_id=pr.get("codex_task_id"), source_github_pr_id=pr["id"],
            title=str(pr.get("pr_title") or "GitHub PR outcome")[:100], description=f"Outcome created from {pr.get('pr_url') or pull_request_id}.",
            expected_impact=improvement.get("predicted_effect") or {}, measurement_plan={"primary_metrics": ["ctr", "cvr"], "source": "MANUAL"},
        )

    def list_outcomes(self, *, user_id: str, project_id: str | None = None, status: str | None = None, search: str | None = None, sort: str = "newest", date_from: str | None = None, date_to: str | None = None, limit: int = 500) -> list[dict[str, Any]]:
        filters = {"project_id": project_id} if project_id else {}
        if status:
            filters["outcome_status"] = self._status(status)
        rows = self.repository.get_many("improvement_outcomes", user_id=user_id, filters=filters, order="created_at.desc", limit=limit)
        query = (search or "").strip().lower()
        if query:
            rows = [row for row in rows if query in f"{row.get('title', '')} {row.get('summary', '')} {row.get('description', '')}".lower()]
        if date_from:
            rows = [row for row in rows if str(row.get("created_at") or "") >= date_from]
        if date_to:
            rows = [row for row in rows if str(row.get("created_at") or "") <= date_to]
        if sort == "improvement_rate":
            key = lambda row: float(row.get("improvement_rate") or 0)
        elif sort == "outcome":
            rank = {"SUCCESS": 4, "PARTIAL_SUCCESS": 3, "NO_IMPACT": 2, "FAILED": 1}
            key = lambda row: rank.get(str(row.get("outcome_status")), 0)
        else:
            key = lambda row: str(row.get("created_at") or "")
        return sorted(rows, key=key, reverse=sort != "oldest")

    def detail(self, *, user_id: str, outcome_id: str) -> dict[str, Any]:
        outcome = self._outcome(user_id, outcome_id)
        return {
            "outcome": outcome,
            "improvement": self._optional("ai_agent_results", user_id, outcome.get("source_ai_result_id")),
            "codex_task": self._optional("codex_task_prompts", user_id, outcome.get("source_codex_task_id")),
            "github_pr": self._optional("github_pull_requests", user_id, outcome.get("source_github_pr_id")),
            "project": self._optional("ad_projects", user_id, outcome.get("project_id")),
            "history": self.repository.get_many("outcome_status_history", user_id=user_id, filters={"outcome_id": outcome_id}, order="changed_at.asc"),
            "learning": self.repository.get_many("outcome_learning_data", user_id=user_id, filters={"outcome_id": outcome_id}, limit=1),
        }

    def record_measurement(self, *, user_id: str, outcome_id: str, before_metrics: dict[str, Any], after_metrics: dict[str, Any], measurement_method: str, measurement_source: str, evidence_data: list[dict[str, Any]], thresholds: dict[str, Any] | None = None, period: dict[str, Any] | None = None) -> dict[str, Any]:
        outcome = self._outcome(user_id, outcome_id)
        if not before_metrics:
            raise ValueError("Before metrics are required.")
        if not after_metrics:
            raise ValueError("After metrics are required.")
        self._validate_period(outcome, period or {})
        if outcome["outcome_status"] == "DRAFT":
            outcome = self.transition(user_id=user_id, outcome_id=outcome_id, new_status="PENDING_MEASUREMENT", reason="Measurement plan accepted.")
        if outcome["outcome_status"] in {"PENDING_MEASUREMENT", "FAILED"}:
            outcome = self.transition(user_id=user_id, outcome_id=outcome_id, new_status="MEASURING", reason="Measurement data received.", payload={"measurement_source": measurement_source})
        if outcome["outcome_status"] != "MEASURING":
            raise ValueError("Outcome must be MEASURING before results can be evaluated.")
        delta = self.calculate_metric_delta(before_metrics, after_metrics)
        evaluation = self.evaluate(before_metrics, after_metrics, thresholds or outcome.get("evaluation_thresholds") or {})
        payload = {
            "before_metrics": before_metrics, "after_metrics": after_metrics, "metric_delta": delta,
            "measurement_method": measurement_method, "measurement_source": measurement_source,
            "evidence_data": evidence_data, "evaluation_thresholds": evaluation["thresholds"],
            "improvement_rate": evaluation["improvement_rate"], "evaluation_result": evaluation,
            "measurement_period": period or {}, "measured_at": _now(),
            "outcome_summary": self.summarize_outcome(delta, evaluation["status"]),
        }
        measured = self.transition(user_id=user_id, outcome_id=outcome_id, new_status=evaluation["status"], reason=payload["outcome_summary"], payload=payload)
        try:
            self.learning.save(user_id=user_id, outcome=measured)
        except Exception as exc:
            measured = self.repository.update_improvement_outcome(user_id=user_id, outcome_id=outcome_id, payload={
                "evaluation_result": {**evaluation, "learning_error": str(exc)}, "updated_by": user_id,
            })
        return measured

    def refresh_from_connector(self, *, user_id: str, outcome_id: str, connector_key: str) -> dict[str, Any]:
        outcome = self._outcome(user_id, outcome_id)
        collected = self.connectors.collect(key=connector_key, user_id=user_id, outcome=outcome)
        return self.record_measurement(user_id=user_id, outcome_id=outcome_id, thresholds=None, period=None, **collected)

    def rebuild_learning(self, *, user_id: str, outcome_id: str) -> dict[str, Any]:
        outcome = self._outcome(user_id, outcome_id)
        learning = self.learning.save(user_id=user_id, outcome=outcome)
        if learning is None:
            raise ValueError("Outcome is not eligible for learning.")
        return learning

    def transition(self, *, user_id: str, outcome_id: str, new_status: str, reason: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        outcome = self._outcome(user_id, outcome_id)
        target = self._status(new_status)
        if target not in ALLOWED_TRANSITIONS[outcome["outcome_status"]]:
            raise ValueError(f"Invalid outcome status transition: {outcome['outcome_status']} -> {target}")
        return self.repository.update_improvement_outcome(user_id=user_id, outcome_id=outcome_id, payload={
            "outcome_status": target, "updated_by": user_id, "outcome_summary": reason, **(payload or {}),
        })

    def update_outcome(self, *, user_id: str, outcome_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        if payload.get("before_metrics") is not None or payload.get("after_metrics") is not None:
            current = self._outcome(user_id, outcome_id)
            before = payload.get("before_metrics") or current.get("before_metrics") or {}
            after = payload.get("after_metrics") or current.get("after_metrics") or {}
            if not before or not after:
                update = {
                    **{key: value for key, value in payload.items() if key != "outcome_status"},
                    "before_metrics": before, "after_metrics": after,
                    "metric_delta": self.calculate_metric_delta(before, after), "updated_by": user_id,
                }
                saved = self.repository.update_improvement_outcome(user_id=user_id, outcome_id=outcome_id, payload=update)
                if saved["outcome_status"] == "DRAFT" and before:
                    return self.transition(user_id=user_id, outcome_id=outcome_id, new_status="PENDING_MEASUREMENT", reason="Before metrics saved; waiting for after metrics.")
                return saved
            return self.record_measurement(
                user_id=user_id, outcome_id=outcome_id,
                before_metrics=before, after_metrics=after,
                measurement_method=payload.get("measurement_method") or "Manual update",
                measurement_source=payload.get("measurement_source") or "MANUAL",
                evidence_data=payload.get("evidence_data") or [], thresholds=payload.get("evaluation_thresholds"), period=payload.get("measurement_period"),
            )
        requested = payload.pop("outcome_status", None)
        if requested:
            return self.transition(user_id=user_id, outcome_id=outcome_id, new_status=requested, reason=payload.get("outcome_summary") or "Outcome status updated.", payload=payload)
        return self.repository.update_improvement_outcome(user_id=user_id, outcome_id=outcome_id, payload={**payload, "updated_by": user_id})

    def stats(self, *, user_id: str) -> dict[str, Any]:
        outcomes = self.list_outcomes(user_id=user_id)
        counts = {status: sum(1 for row in outcomes if row.get("outcome_status") == status) for status in OUTCOME_STATUSES}
        measured = [row for row in outcomes if row.get("outcome_status") in TERMINAL_OUTCOME_STATUSES]
        success = counts["SUCCESS"] + counts["PARTIAL_SUCCESS"]
        rates = [float(row.get("improvement_rate") or 0) for row in measured]
        ctr = [float((row.get("metric_delta") or {}).get("ctr_delta_rate") or 0) for row in measured]
        cvr = [float((row.get("metric_delta") or {}).get("cvr_delta_rate") or 0) for row in measured]
        return {
            "total": len(outcomes), "counts": counts,
            "success_rate": round(success * 100 / len(measured), 2) if measured else 0,
            "failure_rate": round(counts["FAILED"] * 100 / len(measured), 2) if measured else 0,
            "average_improvement_rate": _average(rates), "average_ctr_improvement": _average(ctr), "average_cvr_improvement": _average(cvr),
            "learning": self.learning.stats(user_id=user_id),
        }

    def get_outcome_context_for_analysis(self, *, user_id: str, pair_id: str) -> dict[str, Any]:
        outcomes = [row for row in self.repository.get_improvement_outcomes_for_analysis_context(user_id=user_id, pair_id=pair_id) if self._is_learning_eligible(user_id, row)]
        project_id = outcomes[0].get("project_id") if outcomes else None
        learning = self.learning.context(user_id=user_id, project_id=project_id)
        return {
            "recent_outcomes": outcomes,
            "successful_patterns": [self._pattern(row) for row in outcomes if row.get("outcome_status") in {"SUCCESS", "PARTIAL_SUCCESS"}],
            "failed_patterns": [self._pattern(row) for row in outcomes if row.get("outcome_status") == "FAILED"],
            "inconclusive_patterns": [self._pattern(row) for row in outcomes if row.get("outcome_status") == "NO_IMPACT"],
            "recommendation_learning": learning,
        }

    def get_outcomes_for_pair(self, *, user_id: str, pair_id: str) -> list[dict[str, Any]]:
        return self.repository.get_improvement_outcomes_by_pair(user_id=user_id, pair_id=pair_id)

    def get_latest_outcome_for_pair(self, *, user_id: str, pair_id: str) -> dict[str, Any]:
        return self.repository.get_latest_improvement_outcome_by_pair(user_id=user_id, pair_id=pair_id)

    @staticmethod
    def evaluate(before: dict[str, Any], after: dict[str, Any], thresholds: dict[str, Any]) -> dict[str, Any]:
        effective = {**DEFAULT_THRESHOLDS, **{key: float(value) for key, value in thresholds.items() if key in DEFAULT_THRESHOLDS}}
        rates: dict[str, float] = {}
        for key in METRIC_KEYS:
            old, new = _number(before.get(key)), _number(after.get(key))
            if old is None or new is None:
                continue
            rate = (new - old) / abs(old) if old else (1.0 if new > 0 else 0.0)
            rates[key] = round(-rate if key in LOWER_IS_BETTER else rate, 6)
        if not rates:
            raise ValueError("No comparable before/after metrics were provided.")
        improvement_rate = round(sum(rates.values()) / len(rates), 6)
        status = "SUCCESS" if improvement_rate >= effective["success"] else "PARTIAL_SUCCESS" if improvement_rate >= effective["partial_success"] else "NO_IMPACT" if improvement_rate > effective["failure"] else "FAILED"
        return {"status": status, "improvement_rate": improvement_rate, "metric_improvement_rates": rates, "thresholds": effective}

    @staticmethod
    def calculate_metric_delta(before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key in METRIC_KEYS:
            old, new = _number(before.get(key)), _number(after.get(key))
            if old is None or new is None:
                continue
            result[f"{key}_delta"] = round(new - old, 6)
            result[f"{key}_delta_rate"] = round((new - old) / abs(old), 6) if old else None
        return result

    @staticmethod
    def summarize_outcome(delta: dict[str, Any], status: str) -> str:
        values = [f"{key.removesuffix('_delta_rate')} {float(value) * 100:.2f}%" for key, value in delta.items() if key.endswith("_delta_rate") and value is not None]
        return f"{status}: " + (", ".join(values[:5]) if values else "measured outcome evaluated.")

    def _prevent_duplicate(self, user_id: str, *source_ids: str | None) -> None:
        for key, value in zip(("source_ai_result_id", "source_codex_task_id", "source_github_pr_id"), source_ids):
            if value and self.repository.get_many("improvement_outcomes", user_id=user_id, filters={key: value}, limit=1):
                raise ValueError(f"An outcome already exists for {key}.")

    @staticmethod
    def _validate_period(outcome: dict[str, Any], period: dict[str, Any]) -> None:
        if not period:
            return
        start, end = period.get("start_at"), period.get("end_at")
        if not start or not end:
            raise ValueError("Measurement period requires start_at and end_at.")
        try:
            start_at = datetime.fromisoformat(str(start).replace("Z", "+00:00"))
            end_at = datetime.fromisoformat(str(end).replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError("Measurement period contains an invalid datetime.") from exc
        if end_at <= start_at:
            raise ValueError("Measurement period end_at must be later than start_at.")
        minimum_days = float((outcome.get("measurement_plan") or {}).get("minimum_days") or 0)
        if minimum_days and (end_at - start_at).total_seconds() < minimum_days * 86400:
            raise ValueError("Measurement period is shorter than the configured minimum_days.")

    def _is_learning_eligible(self, user_id: str, outcome: dict[str, Any]) -> bool:
        if outcome.get("outcome_status") not in TERMINAL_OUTCOME_STATUSES:
            return False
        result = self._optional("ai_agent_results", user_id, outcome.get("source_ai_result_id"))
        return not result or result.get("provider_type") == "REAL"

    def _outcome(self, user_id: str, outcome_id: str) -> dict[str, Any]:
        return self.repository.get_one("improvement_outcomes", user_id=user_id, filters={"id": outcome_id})

    def _optional(self, table: str, user_id: str, record_id: str | None) -> dict[str, Any] | None:
        if not record_id:
            return None
        rows = self.repository.get_many(table, user_id=user_id, filters={"id": record_id}, limit=1)
        return rows[0] if rows else None

    @staticmethod
    def _status(status: str) -> str:
        value = status.upper()
        if value not in OUTCOME_STATUSES:
            raise ValueError("Invalid outcome status.")
        return value

    @staticmethod
    def _pattern(outcome: dict[str, Any]) -> dict[str, Any]:
        return {"title": outcome.get("title"), "status": outcome.get("outcome_status"), "metric_delta": outcome.get("metric_delta") or {}, "summary": outcome.get("outcome_summary"), "learning_notes": outcome.get("learning_notes")}


def _number(value: Any) -> float | None:
    try:
        return None if value is None or value == "" else float(value)
    except (TypeError, ValueError):
        return None


def _average(values: list[float]) -> float:
    return round(sum(values) / len(values), 6) if values else 0


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
