from __future__ import annotations

import math
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

from backend.services.outcomes.improvement_outcome_service import ImprovementOutcomeService
from backend.services.supabase.supabase_repository import SupabaseRepository

EXPERIMENT_STATUSES = {"DRAFT", "READY", "RUNNING", "PAUSED", "COMPLETED", "FAILED", "ARCHIVED"}
TRANSITIONS = {
    "DRAFT": {"READY", "ARCHIVED"},
    "READY": {"RUNNING", "ARCHIVED", "FAILED"},
    "RUNNING": {"PAUSED", "COMPLETED", "FAILED"},
    "PAUSED": {"RUNNING", "COMPLETED", "FAILED", "ARCHIVED"},
    "FAILED": {"READY", "ARCHIVED"},
    "COMPLETED": {"ARCHIVED"},
    "ARCHIVED": set(),
}
RATE_METRICS = {
    "ctr": ("clicks", "impressions"),
    "cvr": ("conversions", "clicks"),
    "cta_click_rate": ("cta_clicks", "page_views"),
    "form_submit_rate": ("form_submits", "page_views"),
    "bounce_rate": ("bounces", "sessions"),
}
LOWER_IS_BETTER = {"cpc", "cpa", "bounce_rate"}


class AdABTestService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository

    def list_tests(self, *, user_id: str, project_id: str | None = None, status: str | None = None) -> list[dict[str, Any]]:
        filters: dict[str, Any] = {}
        if project_id:
            filters["project_id"] = project_id
        if status:
            filters["status"] = self._status(status)
        tests = self.repository.get_many("ad_ab_tests", user_id=user_id, filters=filters, order="created_at.desc", limit=200)
        return [self.detail(user_id=user_id, test_id=test["id"], test=test) for test in tests]

    def create_test(
        self,
        *,
        user_id: str,
        project_id: str,
        name: str,
        hypothesis: str | None,
        primary_metric: str,
        ad_ids: list[str],
        experiment_type: str = "AD",
        target_type: str = "AD",
        outcome_id: str | None = None,
        minimum_sample_size: int = 100,
        confidence_threshold: float = 0.95,
    ) -> dict[str, Any]:
        unique_ad_ids = list(dict.fromkeys(ad_ids))
        if len(unique_ad_ids) < 2:
            raise ValueError("Select at least two variants for an experiment.")
        if primary_metric not in {*RATE_METRICS, "cpc", "cpa", "conversion", "revenue", "roas"}:
            raise ValueError("Unsupported primary metric.")
        ads = self.repository.get_many("twitter_ads", user_id=user_id, filters={"id": unique_ad_ids, "project_id": project_id})
        if len(ads) != len(unique_ad_ids):
            raise ValueError("Every selected ad must belong to this project.")
        test = self.repository.insert("ad_ab_tests", {
            "user_id": user_id, "project_id": project_id, "name": name.strip(), "hypothesis": hypothesis,
            "primary_metric": primary_metric, "status": "DRAFT", "experiment_type": experiment_type.upper(),
            "target_type": target_type.upper(), "outcome_id": outcome_id, "minimum_sample_size": minimum_sample_size,
            "confidence_threshold": confidence_threshold, "created_by": user_id,
            "public_tracking_token": secrets.token_urlsafe(32),
        })
        allocation = round(100 / len(unique_ad_ids), 4)
        for index, ad_id in enumerate(unique_ad_ids):
            self.repository.insert("ad_ab_test_variants", {
                "user_id": user_id, "test_id": test["id"], "twitter_ad_id": ad_id, "label": _variant_label(index),
                "name": f"Variant {_variant_label(index)}", "allocation": allocation, "status": "ACTIVE",
            })
        return self.detail(user_id=user_id, test_id=test["id"], test=test)

    def detail(self, *, user_id: str, test_id: str, test: dict[str, Any] | None = None) -> dict[str, Any]:
        experiment = test or self.repository.get_one("ad_ab_tests", user_id=user_id, filters={"id": test_id})
        variants = self.repository.get_many("ad_ab_test_variants", user_id=user_id, filters={"test_id": test_id}, order="created_at.asc")
        ad_ids = [row.get("twitter_ad_id") for row in variants if row.get("twitter_ad_id")]
        ads = self.repository.get_many("twitter_ads", user_id=user_id, filters={"id": ad_ids}) if ad_ids else []
        ads_by_id = {row["id"]: row for row in ads}
        measurements = self.repository.get_many("experiment_measurements", user_id=user_id, filters={"experiment_id": test_id}, order="created_at.desc", limit=500)
        evaluations = self.repository.get_many("experiment_evaluations", user_id=user_id, filters={"experiment_id": test_id}, order="created_at.desc", limit=20)
        history = self.repository.get_many("experiment_status_history", user_id=user_id, filters={"experiment_id": test_id}, order="changed_at.asc", limit=100)
        metric = str(experiment.get("primary_metric") or "ctr")
        enriched = []
        for row in variants:
            variant_measurements = [m for m in measurements if m["variant_id"] == row["id"]]
            ad = ads_by_id.get(row.get("twitter_ad_id"))
            metric_value = _metric(variant_measurements[0], metric) if variant_measurements else _legacy_ad_metric(ad or {}, metric)
            enriched.append({**row, "ad": ad, "measurements": variant_measurements, "metric_value": metric_value})
        provisional = None
        eligible = [row for row in enriched if row.get("ad") or row.get("measurements")]
        if eligible:
            provisional = sorted(eligible, key=lambda row: float(row["metric_value"]), reverse=metric not in LOWER_IS_BETTER)[0]
        return {
            **experiment,
            "variants": enriched,
            "provisional_winner": provisional,
            "note": "Directional only until persisted measurements meet the configured sample and confidence thresholds.",
            "latest_evaluation": evaluations[0] if evaluations else None,
            "history": history,
        }

    def update_test(self, *, user_id: str, test_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        test = self.repository.get_one("ad_ab_tests", user_id=user_id, filters={"id": test_id})
        if test["status"] not in {"DRAFT", "READY", "PAUSED"}:
            raise ValueError("Only DRAFT, READY, or PAUSED experiments can be edited.")
        allowed = {key: value for key, value in payload.items() if key in {"name", "hypothesis", "primary_metric", "minimum_sample_size", "confidence_threshold", "evaluation_window_days"}}
        self.repository.update("ad_ab_tests", user_id=user_id, filters={"id": test_id}, payload={**allowed, "updated_by": user_id})
        return self.detail(user_id=user_id, test_id=test_id)

    def delete_test(self, *, user_id: str, test_id: str) -> None:
        test = self.repository.get_one("ad_ab_tests", user_id=user_id, filters={"id": test_id})
        if test["status"] not in {"DRAFT", "ARCHIVED"}:
            raise ValueError("Only DRAFT or ARCHIVED experiments can be deleted.")
        self.repository.delete("ad_ab_tests", user_id=user_id, filters={"id": test_id})

    def update_status(self, *, user_id: str, test_id: str, status: str, reason: str | None = None) -> dict[str, Any]:
        test = self.repository.get_one("ad_ab_tests", user_id=user_id, filters={"id": test_id})
        target = self._status(status)
        if target not in TRANSITIONS[test["status"]]:
            raise ValueError(f"Invalid experiment status transition: {test['status']} -> {target}")
        if target == "READY":
            self._validate_allocation(user_id, test_id)
        if target == "COMPLETED":
            evaluations = self.repository.get_many("experiment_evaluations", user_id=user_id, filters={"experiment_id": test_id, "status": "WINNER_FOUND"}, limit=1)
            if not evaluations:
                raise ValueError("A statistically significant winner is required before completion.")
        payload: dict[str, Any] = {"status": target, "updated_by": user_id, "failure_reason": reason if target == "FAILED" else None}
        if target == "RUNNING":
            payload.update({"started_at": test.get("started_at") or _now(), "paused_at": None})
        updated = self.repository.update("ad_ab_tests", user_id=user_id, filters={"id": test_id}, payload=payload)
        if target == "FAILED":
            self.repository.insert("user_notifications", {
                "user_id": user_id, "category": "experiment_alert", "title": f"Experiment failed: {test['name']}",
                "body": reason or "Experiment execution failed.", "target_type": "ad_ab_tests", "target_id": test_id, "target_url": f"/experiments/{test_id}",
            })
        return self.detail(user_id=user_id, test_id=test_id, test=updated)

    def update_allocations(self, *, user_id: str, test_id: str, allocations: list[dict[str, Any]]) -> dict[str, Any]:
        test = self.repository.get_one("ad_ab_tests", user_id=user_id, filters={"id": test_id})
        if test["status"] not in {"DRAFT", "READY", "PAUSED", "RUNNING"}:
            raise ValueError("Allocation cannot be changed in the current status.")
        total = sum(float(row["allocation"]) for row in allocations)
        if abs(total - 100) > 0.001:
            raise ValueError("Variant allocation must total 100%.")
        variants = {row["id"]: row for row in self.repository.get_many("ad_ab_test_variants", user_id=user_id, filters={"test_id": test_id})}
        for allocation in allocations:
            variant_id = str(allocation["variant_id"])
            if variant_id not in variants:
                raise ValueError("Variant does not belong to this experiment.")
            self.repository.update("ad_ab_test_variants", user_id=user_id, filters={"id": variant_id}, payload={"allocation": float(allocation["allocation"])})
        return self.detail(user_id=user_id, test_id=test_id)

    def create_variant(self, *, user_id: str, test_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        test = self.repository.get_one("ad_ab_tests", user_id=user_id, filters={"id": test_id})
        if test["status"] not in {"DRAFT", "READY"}:
            raise ValueError("Variants can be added only before the experiment starts.")
        variants = self.repository.get_many("ad_ab_test_variants", user_id=user_id, filters={"test_id": test_id})
        ad_id, lp_id = payload.get("twitter_ad_id"), payload.get("landing_page_id")
        if ad_id:
            self.repository.get_one("twitter_ads", user_id=user_id, filters={"id": ad_id, "project_id": test["project_id"]})
        if lp_id:
            self.repository.get_one("landing_pages", user_id=user_id, filters={"id": lp_id, "project_id": test["project_id"]})
        if not ad_id and not lp_id and not payload.get("configuration"):
            raise ValueError("A variant requires an ad, landing page, or configuration.")
        label = payload.get("label") or _variant_label(len(variants))
        variant = self.repository.insert("ad_ab_test_variants", {
            "user_id": user_id, "test_id": test_id, "twitter_ad_id": ad_id, "landing_page_id": lp_id,
            "label": label, "name": payload.get("name") or f"Variant {label}", "description": payload.get("description"),
            "allocation": float(payload.get("allocation") or 1), "status": "ACTIVE", "configuration": payload.get("configuration") or {},
        })
        return variant

    def update_variant(self, *, user_id: str, test_id: str, variant_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        test = self.repository.get_one("ad_ab_tests", user_id=user_id, filters={"id": test_id})
        if test["status"] not in {"DRAFT", "READY", "PAUSED"}:
            raise ValueError("Variant editing is not allowed in the current status.")
        self.repository.get_one("ad_ab_test_variants", user_id=user_id, filters={"id": variant_id, "test_id": test_id})
        allowed = {key: value for key, value in payload.items() if key in {"name", "description", "status", "configuration"}}
        return self.repository.update("ad_ab_test_variants", user_id=user_id, filters={"id": variant_id}, payload=allowed)

    def delete_variant(self, *, user_id: str, test_id: str, variant_id: str) -> None:
        test = self.repository.get_one("ad_ab_tests", user_id=user_id, filters={"id": test_id})
        if test["status"] != "DRAFT":
            raise ValueError("Variants can be deleted only in DRAFT.")
        variants = self.repository.get_many("ad_ab_test_variants", user_id=user_id, filters={"test_id": test_id})
        if len(variants) <= 2:
            raise ValueError("An experiment must retain at least two variants.")
        self.repository.delete("ad_ab_test_variants", user_id=user_id, filters={"id": variant_id, "test_id": test_id})

    def assign_variant(self, *, tracking_token: str, session_id: str) -> dict[str, Any]:
        tests = self.repository.get_related_many("ad_ab_tests", filters={"public_tracking_token": tracking_token}, limit=1)
        if not tests or tests[0]["status"] != "RUNNING":
            raise ValueError("Experiment is unavailable for traffic allocation.")
        test = tests[0]
        variants = [row for row in self.repository.get_related_many("ad_ab_test_variants", filters={"test_id": test["id"]}, order="created_at.asc") if row.get("status") == "ACTIVE"]
        if len(variants) < 2:
            raise ValueError("Experiment does not have enough active variants.")
        point = int(hashlib.sha256(f"{test['id']}:{session_id}".encode()).hexdigest()[:12], 16) % 10000 / 100
        cursor = 0.0
        for variant in variants:
            cursor += float(variant.get("allocation") or 0)
            if point < cursor:
                return {"experiment_id": test["id"], "variant_id": variant["id"], "name": variant["name"], "configuration": variant.get("configuration") or {}}
        variant = variants[-1]
        return {"experiment_id": test["id"], "variant_id": variant["id"], "name": variant["name"], "configuration": variant.get("configuration") or {}}

    def ingest_lp_event(self, *, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        test = self.repository.get_one("ad_ab_tests", user_id=user_id, filters={"id": payload["experiment_id"]})
        if test["status"] != "RUNNING":
            raise ValueError("LP analytics events are accepted only for RUNNING experiments.")
        variant = self.repository.get_one("ad_ab_test_variants", user_id=user_id, filters={"id": payload["variant_id"], "test_id": test["id"]})
        return self.repository.insert("lp_analytics_events", {
            "user_id": user_id, "project_id": test["project_id"], "experiment_id": test["id"], "variant_id": variant["id"],
            "landing_page_id": variant.get("landing_page_id"), "session_id": payload["session_id"], "event_name": payload["event_name"],
            "event_value": payload.get("event_value"), "revenue": payload.get("revenue") or 0, "occurred_at": payload.get("occurred_at") or _now(),
            "source": "LP_RUNTIME", "idempotency_key": payload["idempotency_key"], "metadata": payload.get("metadata") or {},
        })

    def ingest_public_lp_event(self, *, tracking_token: str, payload: dict[str, Any]) -> dict[str, Any]:
        tests = self.repository.get_related_many("ad_ab_tests", filters={"public_tracking_token": tracking_token}, limit=1)
        if not tests:
            raise ValueError("Invalid experiment tracking token.")
        test = tests[0]
        if payload.get("experiment_id") and payload["experiment_id"] != test["id"]:
            raise ValueError("Tracking token does not match the experiment.")
        assignment = self.assign_variant(tracking_token=tracking_token, session_id=payload["session_id"])
        if payload["variant_id"] != assignment["variant_id"]:
            raise ValueError("Variant does not match the assigned session variant.")
        if payload["event_name"] in {"CONVERSION", "REVENUE"} or float(payload.get("revenue") or 0) != 0:
            raise ValueError("Revenue and conversion events require an authenticated server-side source.")
        existing = self.repository.get_many(
            "lp_analytics_events",
            user_id=test["user_id"],
            filters={
                "experiment_id": test["id"],
                "variant_id": payload["variant_id"],
                "session_id": payload["session_id"],
                "event_name": payload["event_name"],
            },
            limit=1,
        )
        if existing:
            return {**existing[0], "_reused": True}
        public_idempotency_key = hashlib.sha256(
            f"{test['id']}:{payload['variant_id']}:{payload['session_id']}:{payload['event_name']}".encode(),
        ).hexdigest()
        return self.ingest_lp_event(
            user_id=test["user_id"],
            payload={
                **payload,
                "experiment_id": test["id"],
                "revenue": 0,
                "idempotency_key": public_idempotency_key,
                "metadata": {**(payload.get("metadata") or {}), "public_event": True},
            },
        )

    def collect_measurements(self, *, user_id: str, test_id: str) -> dict[str, Any]:
        test = self.repository.get_one("ad_ab_tests", user_id=user_id, filters={"id": test_id})
        variants = self.repository.get_many("ad_ab_test_variants", user_id=user_id, filters={"test_id": test_id})
        start = test.get("started_at") or (datetime.now(timezone.utc) - timedelta(days=int(test.get("evaluation_window_days") or 7))).isoformat()
        end = _now()
        saved = []
        for variant in variants:
            lp_events = self.repository.get_many("lp_analytics_events", user_id=user_id, filters={"experiment_id": test_id, "variant_id": variant["id"]}, limit=10000)
            snapshots = self.repository.get_many("x_ads_metric_snapshots", user_id=user_id, filters={"twitter_ad_id": variant.get("twitter_ad_id")}, order="snapshot_date.asc", limit=1000) if variant.get("twitter_ad_id") else []
            metrics, source, evidence = _aggregate(lp_events, snapshots)
            existing = self.repository.get_many("experiment_measurements", user_id=user_id, filters={"experiment_id": test_id, "variant_id": variant["id"], "source": source, "period_start": start, "period_end": end}, limit=1)
            row = {"user_id": user_id, "project_id": test["project_id"], "experiment_id": test_id, "variant_id": variant["id"], "source": source, "period_start": start, "period_end": end, **metrics, "calculated_metrics": _calculated(metrics), "evidence": evidence}
            saved.append(self.repository.update("experiment_measurements", user_id=user_id, filters={"id": existing[0]["id"]}, payload=row) if existing else self.repository.insert("experiment_measurements", row))
        return {"experiment_id": test_id, "measurements": saved}

    def evaluate(self, *, user_id: str, test_id: str, complete: bool = False) -> dict[str, Any]:
        test = self.repository.get_one("ad_ab_tests", user_id=user_id, filters={"id": test_id})
        self.collect_measurements(user_id=user_id, test_id=test_id)
        variants = self.repository.get_many("ad_ab_test_variants", user_id=user_id, filters={"test_id": test_id})
        measurements = self.repository.get_many("experiment_measurements", user_id=user_id, filters={"experiment_id": test_id}, order="created_at.desc", limit=500)
        latest = {variant["id"]: next((row for row in measurements if row["variant_id"] == variant["id"]), None) for variant in variants}
        result = _evaluate(test, variants, latest)
        evaluation = self.repository.insert("experiment_evaluations", {"user_id": user_id, "project_id": test["project_id"], "experiment_id": test_id, **result})
        self.repository.update("ad_ab_tests", user_id=user_id, filters={"id": test_id}, payload={"winner_variant_id": result["winner_variant_id"], "evaluation_summary": evaluation, "updated_by": user_id})
        if result["status"] == "WINNER_FOUND":
            self._save_learning_revenue_insight(user_id, test, variants, latest, evaluation)
            if result["winner_variant_id"] == variants[0]["id"]:
                self.repository.insert("user_notifications", {
                    "user_id": user_id, "category": "experiment_alert", "title": f"Variant degradation detected: {test['name']}",
                    "body": "The control variant remained the statistically significant winner. Review the losing variants before further rollout.",
                    "target_type": "ad_ab_tests", "target_id": test_id, "target_url": f"/experiments/{test_id}",
                })
            for variant in variants:
                self.repository.update("ad_ab_test_variants", user_id=user_id, filters={"id": variant["id"]}, payload={"status": "WINNER" if variant["id"] == result["winner_variant_id"] else "LOSER"})
            if complete and test["status"] in {"RUNNING", "PAUSED"}:
                self.update_status(user_id=user_id, test_id=test_id, status="COMPLETED", reason="Winner detected.")
        return self.detail(user_id=user_id, test_id=test_id)

    def executive_dashboard(self, *, user_id: str) -> dict[str, Any]:
        result = self.repository.rpc("get_experiment_executive_dashboard", {"p_user_id": user_id})
        return result if isinstance(result, dict) else {}

    def learning_context(self, *, user_id: str, project_id: str | None = None) -> dict[str, Any]:
        rows = self.repository.get_many("experiment_learning_data", user_id=user_id, filters={"project_id": project_id} if project_id else None, order="impact_score.desc", limit=100)
        return {"count": len(rows), "patterns": rows[:20], "guardrail": "Experiment learning is based only on persisted measurements and completed evaluations."}

    def sync_running_experiments(self) -> dict[str, int]:
        rows = self.repository.get_related_many("ad_ab_tests", filters={"status": "RUNNING"}, limit=500)
        completed, failed = 0, 0
        for row in rows:
            try:
                result = self.evaluate(user_id=row["user_id"], test_id=row["id"], complete=True)
                completed += int(result.get("status") == "COMPLETED")
            except Exception as exc:
                failed += 1
                self.repository.insert("user_notifications", {
                    "user_id": row["user_id"], "category": "experiment", "title": f"Experiment evaluation failed: {row['name']}",
                    "body": str(exc), "target_type": "ad_ab_tests", "target_id": row["id"], "target_url": f"/experiments/{row['id']}",
                })
        return {"checked": len(rows), "completed": completed, "failed": failed}

    def _save_learning_revenue_insight(self, user_id: str, test: dict[str, Any], variants: list[dict[str, Any]], latest: dict[str, Any], evaluation: dict[str, Any]) -> None:
        winner = next(row for row in variants if row["id"] == evaluation["winner_variant_id"])
        losers = [row for row in variants if row["id"] != winner["id"]]
        self.repository.insert("experiment_learning_data", {
            "user_id": user_id, "project_id": test["project_id"], "experiment_id": test["id"], "evaluation_id": evaluation["id"],
            "experiment_type": test.get("experiment_type") or "AD", "winner_pattern": winner.get("configuration") or {"name": winner["name"]},
            "loser_pattern": {"variants": [row.get("configuration") or {"name": row["name"]} for row in losers]},
            "impact_score": evaluation["improvement_rate"], "confidence_score": evaluation["confidence_score"],
        })
        winner_metrics = latest[winner["id"]] or {}
        baseline = latest[losers[0]["id"]] or {}
        revenue = {
            "baseline_conversions": baseline.get("conversions") or 0, "measured_conversions": winner_metrics.get("conversions") or 0,
            "incremental_conversions": (winner_metrics.get("conversions") or 0) - (baseline.get("conversions") or 0),
            "baseline_revenue": baseline.get("revenue") or 0, "measured_revenue": winner_metrics.get("revenue") or 0,
            "incremental_revenue": (winner_metrics.get("revenue") or 0) - (baseline.get("revenue") or 0),
            "cpa_improvement": _metric(baseline, "cpa") - _metric(winner_metrics, "cpa"),
            "roas_improvement": _metric(winner_metrics, "roas") - _metric(baseline, "roas"),
        }
        self.repository.insert("revenue_impacts", {"user_id": user_id, "project_id": test["project_id"], "experiment_id": test["id"], "outcome_id": test.get("outcome_id"), "evaluation_id": evaluation["id"], **revenue, "calculation": {"source": "experiment_measurements"}})
        insight = f"{winner['name']} improved {test['primary_metric']} by {float(evaluation['improvement_rate']) * 100:.2f}% with {float(evaluation['confidence_score']) * 100:.2f}% confidence."
        self.repository.insert("experiment_insights", {"user_id": user_id, "project_id": test["project_id"], "experiment_id": test["id"], "evaluation_id": evaluation["id"], "title": f"Winner detected: {winner['name']}", "summary": insight, "evidence": evaluation["evidence"]})
        self.repository.insert("user_notifications", {"user_id": user_id, "category": "experiment", "title": f"Winner detected: {winner['name']}", "body": insight, "target_type": "ad_ab_tests", "target_id": test["id"], "target_url": f"/experiments/{test['id']}"})
        if test.get("outcome_id"):
            before = _measurement_metrics(baseline)
            after = _measurement_metrics(winner_metrics)
            ImprovementOutcomeService(repository=self.repository).record_measurement(
                user_id=user_id, outcome_id=test["outcome_id"], before_metrics=before, after_metrics=after,
                measurement_method="Experiment winner evaluation", measurement_source="EXPERIMENT",
                evidence_data=evaluation["evidence"], thresholds=None,
                period={"start_at": winner_metrics["period_start"], "end_at": winner_metrics["period_end"]},
            )

    def _validate_allocation(self, user_id: str, test_id: str) -> None:
        variants = self.repository.get_many("ad_ab_test_variants", user_id=user_id, filters={"test_id": test_id})
        if len(variants) < 2 or abs(sum(float(row.get("allocation") or 0) for row in variants) - 100) > 0.001:
            raise ValueError("Experiment requires at least two variants with allocations totaling 100%.")

    @staticmethod
    def _status(status: str) -> str:
        value = status.upper()
        if value not in EXPERIMENT_STATUSES:
            raise ValueError("Invalid experiment status.")
        return value


def _aggregate(events: list[dict[str, Any]], snapshots: list[dict[str, Any]]) -> tuple[dict[str, Any], str, list[dict[str, Any]]]:
    if events:
        names = [row["event_name"] for row in events]
        sessions = len({row["session_id"] for row in events})
        metrics = {"sessions": sessions, "impressions": 0, "page_views": names.count("PAGE_VIEW"), "clicks": 0, "cta_clicks": names.count("CTA_CLICK"), "form_submits": names.count("FORM_SUBMIT"), "conversions": names.count("CONVERSION"), "bounces": names.count("BOUNCE"), "scroll_depth": _avg([row.get("event_value") for row in events if row["event_name"] == "SCROLL_DEPTH"]), "time_on_page": _avg([row.get("event_value") for row in events if row["event_name"] == "TIME_ON_PAGE"]), "spend": 0, "revenue": sum(float(row.get("revenue") or 0) for row in events)}
        return metrics, "LP_RUNTIME", [{"event_id": row["id"], "event_name": row["event_name"]} for row in events[:100]]
    metrics = {"sessions": 0, "impressions": sum(int(row.get("impressions") or 0) for row in snapshots), "page_views": 0, "clicks": sum(int(row.get("clicks") or 0) for row in snapshots), "cta_clicks": 0, "form_submits": 0, "conversions": sum(int(row.get("conversions") or 0) for row in snapshots), "bounces": 0, "scroll_depth": 0, "time_on_page": 0, "spend": sum(float(row.get("spend") or 0) for row in snapshots), "revenue": sum(float((row.get("raw_metrics") or {}).get("revenue") or 0) for row in snapshots)}
    return metrics, "X_ADS", [{"snapshot_id": row["id"], "snapshot_date": row.get("snapshot_date")} for row in snapshots[:100]]


def _calculated(row: dict[str, Any]) -> dict[str, float]:
    return {
        "ctr": _divide(row["clicks"], row["impressions"]), "cvr": _divide(row["conversions"], row["clicks"]),
        "cta_click_rate": _divide(row["cta_clicks"], row["page_views"]), "form_submit_rate": _divide(row["form_submits"], row["page_views"]),
        "bounce_rate": _divide(row["bounces"], row["sessions"]), "cpc": _divide(row["spend"], row["clicks"]),
        "cpa": _divide(row["spend"], row["conversions"]), "roas": _divide(row["revenue"], row["spend"]),
    }


def _evaluate(test: dict[str, Any], variants: list[dict[str, Any]], latest: dict[str, Any]) -> dict[str, Any]:
    metric = test["primary_metric"]
    values = [(row, latest.get(row["id"]), _metric(latest.get(row["id"]) or {}, metric)) for row in variants]
    sample_size = sum(_sample(row or {}, metric) for _, row, _ in values)
    evidence = [{"variant_id": variant["id"], "measurement_id": (measurement or {}).get("id"), "value": value, "sample_size": _sample(measurement or {}, metric)} for variant, measurement, value in values]
    minimum = int(test.get("minimum_sample_size") or 100)
    if any(measurement is None for _, measurement, _ in values) or any(_sample(measurement or {}, metric) < minimum for _, measurement, _ in values):
        return {"winner_variant_id": None, "loser_variant_ids": [], "metric": metric, "improvement_rate": 0, "confidence_score": 0, "statistically_significant": False, "sample_size": sample_size, "status": "INSUFFICIENT_DATA", "reason": f"Each variant requires at least {minimum} samples.", "evidence": evidence}
    ordered = sorted(values, key=lambda item: item[2], reverse=metric not in LOWER_IS_BETTER)
    winner, runner = ordered[0], ordered[1]
    improvement = ((runner[2] - winner[2]) / abs(runner[2])) if metric in LOWER_IS_BETTER and runner[2] else ((winner[2] - runner[2]) / abs(runner[2])) if runner[2] else 0
    confidence = _confidence(winner[1] or {}, runner[1] or {}, metric)
    significant = confidence >= float(test.get("confidence_threshold") or 0.95) and improvement > 0
    return {"winner_variant_id": winner[0]["id"] if significant else None, "loser_variant_ids": [row[0]["id"] for row in ordered[1:]] if significant else [], "metric": metric, "improvement_rate": round(improvement, 6), "confidence_score": round(confidence, 6), "statistically_significant": significant, "sample_size": sample_size, "status": "WINNER_FOUND" if significant else "NO_WINNER", "reason": "Winner meets sample and confidence thresholds." if significant else "No variant meets the configured confidence threshold.", "evidence": evidence}


def _confidence(a: dict[str, Any], b: dict[str, Any], metric: str) -> float:
    if metric not in RATE_METRICS:
        return min(0.99, 1 - math.exp(-min(_sample(a, metric), _sample(b, metric)) / 500))
    numerator, denominator = RATE_METRICS[metric]
    n1, n2 = float(a.get(denominator) or 0), float(b.get(denominator) or 0)
    if not n1 or not n2:
        return 0
    p1, p2 = float(a.get(numerator) or 0) / n1, float(b.get(numerator) or 0) / n2
    pooled = (float(a.get(numerator) or 0) + float(b.get(numerator) or 0)) / (n1 + n2)
    error = math.sqrt(max(pooled * (1 - pooled) * (1 / n1 + 1 / n2), 0))
    if not error:
        return 0
    z = abs(p1 - p2) / error
    return max(0, min(1, math.erf(z / math.sqrt(2))))


def _metric(row: dict[str, Any], metric: str) -> float:
    if metric == "conversion":
        return float(row.get("conversions") or 0)
    if metric == "revenue":
        return float(row.get("revenue") or 0)
    return float((row.get("calculated_metrics") or _calculated({key: row.get(key) or 0 for key in ("clicks", "impressions", "conversions", "page_views", "cta_clicks", "form_submits", "bounces", "sessions", "spend", "revenue")})).get(metric) or 0)


def _legacy_ad_metric(ad: dict[str, Any], metric: str) -> float:
    data = {
        "clicks": ad.get("clicks") or 0, "impressions": ad.get("impressions") or 0,
        "conversions": ad.get("conversions") or 0, "page_views": 0, "cta_clicks": 0,
        "form_submits": 0, "bounces": 0, "sessions": 0, "spend": ad.get("spend") or 0, "revenue": ad.get("revenue") or 0,
    }
    return _metric(data, metric)


def _measurement_metrics(row: dict[str, Any]) -> dict[str, Any]:
    return {
        **{key: row.get(key) or 0 for key in ("impressions", "clicks", "conversions", "spend", "revenue", "sessions", "page_views", "bounces", "scroll_depth", "time_on_page")},
        **(row.get("calculated_metrics") or {}),
    }


def _sample(row: dict[str, Any], metric: str) -> int:
    if metric in RATE_METRICS:
        return int(row.get(RATE_METRICS[metric][1]) or 0)
    return int(row.get("sessions") or row.get("impressions") or row.get("clicks") or 0)


def _divide(a: Any, b: Any) -> float:
    return float(a or 0) / float(b or 0) if float(b or 0) else 0


def _avg(values: list[Any]) -> float:
    numbers = [float(value) for value in values if value is not None]
    return sum(numbers) / len(numbers) if numbers else 0


def _variant_label(index: int) -> str:
    return chr(ord("A") + index) if index < 26 else f"V{index + 1}"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
