from __future__ import annotations

from typing import Any

from backend.services.demand.demand_models import DemandSolutionFit


class SolutionFitEngine:
    def build_targets(self, *, ad: dict[str, Any] | None, lp: dict[str, Any] | None, summary: dict[str, Any], solution_text: str | None = None) -> list[tuple[str, str]]:
        ad = ad or {}
        lp = lp or {}
        targets = [
            ("pair", " ".join(str(value or "") for value in [ad.get("headline"), ad.get("body"), ad.get("cta"), lp.get("hero_title"), lp.get("hero_subtitle"), lp.get("offer_text"), lp.get("target_audience")])),
            ("ad_copy", " ".join(str(value or "") for value in [ad.get("headline"), ad.get("body"), ad.get("cta")])),
            ("lp_hero", " ".join(str(value or "") for value in [lp.get("hero_title"), lp.get("hero_subtitle")])),
            ("lp_offer", " ".join(str(value or "") for value in [lp.get("offer_text"), lp.get("primary_cta")])),
            ("positioning", " ".join(summary.get("recommended_positioning", {}).get("key_messages", []) if isinstance(summary.get("recommended_positioning"), dict) else [])),
        ]
        for feature in summary.get("recommended_features", []) if isinstance(summary.get("recommended_features"), list) else []:
            targets.append(("feature", " ".join(str(feature.get(key, "")) for key in ["feature_name", "reason", "mvp"])))
        if solution_text:
            targets.append(("app_idea", solution_text))
        return [(target_type, text.strip()) for target_type, text in targets if text and text.strip()]

    def evaluate(self, *, clusters: list[dict[str, Any]], targets: list[tuple[str, str]], locale: str = "ja") -> tuple[list[dict[str, Any]], dict[str, Any]]:
        fits: list[dict[str, Any]] = []
        for target_type, target_text in targets:
            target_tokens = _tokens(target_text)
            for cluster in clusters:
                cluster_text = " ".join([str(cluster.get("name") or ""), *[str(value) for value in cluster.get("root_causes", [])], *[str(value) for value in cluster.get("representative_quotes", [])]])
                cluster_tokens = _tokens(cluster_text)
                overlap = len(target_tokens & cluster_tokens)
                similarity = overlap / max(1, len(cluster_tokens))
                validation_score = float(cluster.get("validation_score") or 0)
                fit_score = min(100, round(similarity * 70 + validation_score * 0.25 + (10 if overlap else 0), 2))
                gap_score = max(0, round(float(cluster.get("demand_signal_score") or 0) - fit_score, 2))
                matched = [str(cluster.get("name"))] if fit_score >= 45 else []
                unmatched = [str(cluster.get("name"))] if fit_score < 45 and float(cluster.get("demand_signal_score") or 0) >= 55 else []
                fit = DemandSolutionFit(
                    fit_target_type=target_type,
                    fit_target_text=target_text,
                    cluster_id=cluster.get("db_id") or cluster.get("id"),
                    fit_score=fit_score,
                    coverage_score=max(0, min(100, fit_score - gap_score * 0.15)),
                    gap_score=gap_score,
                    confidence=min(0.95, 0.35 + fit_score / 140),
                    matched_pains=matched,
                    unmatched_pains=unmatched,
                    recommended_adjustments=_adjustments(cluster, target_type, fit_score, locale=locale),
                    evidence_signal_ids=[str(value) for value in cluster.get("evidence_signal_ids", [])],
                )
                fits.append(fit.model_dump(mode="json"))
        summary = {
            "average_fit_score": round(_avg([item["fit_score"] for item in fits]), 2),
            "top_solution_fit_gaps": sorted([item for item in fits if item["gap_score"] >= 35], key=lambda item: item["gap_score"], reverse=True)[:8],
            "matched_solution_pains": sorted({pain for item in fits for pain in item["matched_pains"]}),
            "unmatched_solution_pains": sorted({pain for item in fits for pain in item["unmatched_pains"]}),
            "recommended_message_adjustments": [adjustment for item in fits for adjustment in item["recommended_adjustments"]][:8],
            "feature_fit_scores": [item for item in fits if item["fit_target_type"] == "feature"][:10],
        }
        return fits, summary


def _tokens(text: str) -> set[str]:
    return {token for token in text.replace("、", " ").replace("。", " ").replace("/", " ").split() if token}


def _adjustments(cluster: dict[str, Any], target_type: str, fit_score: float, *, locale: str = "ja") -> list[str]:
    if locale != "ja":
        if fit_score >= 60:
            return [f"{target_type} has a reasonable fit with '{cluster.get('name')}'. Keep the message grounded in evidence."]
        return [f"Strengthen the concrete solution context for '{cluster.get('name')}' in {target_type}."]
    if fit_score >= 60:
        return [f"{target_type} は「{cluster.get('name')}」に一定程度合っています。根拠つきで表現を維持してください。"]
    return [f"{target_type} で「{cluster.get('name')}」への具体的な解決文脈を強めてください。"]


def _avg(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0
