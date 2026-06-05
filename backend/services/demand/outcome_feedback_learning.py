from __future__ import annotations

from typing import Any


class OutcomeFeedbackLearning:
    def build(
        self,
        *,
        clusters: list[dict[str, Any]],
        outcomes: list[dict[str, Any]],
        search_signals: list[dict[str, Any]],
        market_estimates: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        search_score = self._average([float(signal.get("search_demand_score") or 0) for signal in search_signals])
        market_by_name = {str(item.get("segment_name") or "").lower(): item for item in market_estimates}
        links = []
        for outcome in outcomes[:30]:
            cluster = self._nearest_cluster(outcome, clusters)
            metric_delta = outcome.get("metric_delta") or {}
            status = self._learning_status(outcome, metric_delta)
            market = market_by_name.get(str((cluster or {}).get("name") or "").lower(), {})
            links.append(
                {
                    "cluster_id": (cluster or {}).get("db_id") or (cluster or {}).get("id"),
                    "ad_lp_pair_id": outcome.get("ad_lp_pair_id"),
                    "analysis_run_id": None,
                    "outcome_id": outcome.get("id"),
                    "demand_signal_score": (cluster or {}).get("demand_signal_score"),
                    "validation_score": (cluster or {}).get("validation_score"),
                    "fit_score": (cluster or {}).get("fit_score"),
                    "search_demand_score": search_score,
                    "market_size_score": market.get("market_size_score"),
                    "before_metrics": outcome.get("before_metrics") or {},
                    "after_metrics": outcome.get("after_metrics") or {},
                    "metric_delta": metric_delta,
                    "learning_status": status,
                    "learning_summary": self._summary_text(outcome, cluster, status),
                },
            )
        summary = {
            "outcome_learning_summary": self._overview(links),
            "validated_demand_patterns": [link["learning_summary"] for link in links if link["learning_status"] == "positive"][:5],
            "failed_demand_patterns": [link["learning_summary"] for link in links if link["learning_status"] == "negative"][:5],
            "inconclusive_demand_patterns": [link["learning_summary"] for link in links if link["learning_status"] in {"neutral", "inconclusive", "unknown"}][:5],
            "recommended_next_tests": self._next_tests(links, clusters),
            "linked_outcome_count": len(links),
            "guardrail": "Outcome learning is historical feedback, not a guarantee that the same demand signal will perform again.",
        }
        return links, summary

    @staticmethod
    def _nearest_cluster(outcome: dict[str, Any], clusters: list[dict[str, Any]]) -> dict[str, Any] | None:
        text = " ".join(str(outcome.get(key) or "") for key in ["title", "description", "outcome_summary", "learning_notes"]).lower()
        best: tuple[int, dict[str, Any] | None] = (0, clusters[0] if clusters else None)
        for cluster in clusters:
            name = str(cluster.get("name") or "").lower()
            overlap = len(set(text.split()) & set(name.split()))
            if name and name in text:
                overlap += 3
            if overlap > best[0]:
                best = (overlap, cluster)
        return best[1]

    @staticmethod
    def _learning_status(outcome: dict[str, Any], metric_delta: dict[str, Any]) -> str:
        explicit = outcome.get("outcome_status")
        if explicit in {"positive", "neutral", "negative", "inconclusive"}:
            return str(explicit)
        ctr = float(metric_delta.get("ctr_delta_rate") or metric_delta.get("ctr_delta") or 0)
        cvr = float(metric_delta.get("cvr_delta_rate") or metric_delta.get("cvr_delta") or 0)
        bounce = float(metric_delta.get("bounce_rate_delta") or 0)
        if ctr > 0 and cvr >= 0 and bounce <= 0:
            return "positive"
        if ctr < 0 and cvr < 0:
            return "negative"
        if not metric_delta:
            return "unknown"
        return "neutral"

    @staticmethod
    def _summary_text(outcome: dict[str, Any], cluster: dict[str, Any] | None, status: str) -> str:
        cluster_name = (cluster or {}).get("name") or "unmatched demand cluster"
        title = outcome.get("title") or "outcome"
        return f"{title} linked to {cluster_name}: {status} feedback from measured outcome."

    @staticmethod
    def _overview(links: list[dict[str, Any]]) -> dict[str, Any]:
        return {
            "positive_count": sum(1 for link in links if link["learning_status"] == "positive"),
            "negative_count": sum(1 for link in links if link["learning_status"] == "negative"),
            "neutral_count": sum(1 for link in links if link["learning_status"] == "neutral"),
            "inconclusive_count": sum(1 for link in links if link["learning_status"] in {"inconclusive", "unknown"}),
        }

    @staticmethod
    def _next_tests(links: list[dict[str, Any]], clusters: list[dict[str, Any]]) -> list[str]:
        negative_cluster_ids = {link.get("cluster_id") for link in links if link.get("learning_status") == "negative"}
        tests = []
        for cluster in clusters[:5]:
            if cluster.get("db_id") in negative_cluster_ids or cluster.get("id") in negative_cluster_ids:
                tests.append(f"Retest {cluster.get('name')} with softer claim and clearer evidence.")
            else:
                tests.append(f"Test ad/LP message around {cluster.get('name')} with evidence-backed copy.")
        return tests[:5]

    @staticmethod
    def _average(values: list[float]) -> float:
        cleaned = [value for value in values if isinstance(value, (int, float))]
        return round(sum(cleaned) / len(cleaned), 2) if cleaned else 0
