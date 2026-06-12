from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class DeterministicLLMClient:
    provider_type = "MOCK"
    source_provider = "deterministic"
    failure_reason = "Deterministic rule-based AI fallback was used."

    def generate_json(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
        response_model: type[BaseModel],
    ) -> dict[str, Any]:
        if response_model.__name__ == "AdImprovementResult":
            return {
                "problems": [
                    "No registered ad performance pattern was provided to this standalone workflow.",
                    "Use a real ad and LP pair before treating this as an implementation recommendation.",
                ],
                "suggestions": [
                    "Run analysis against registered ad and LP records.",
                    "Use Demand Intelligence evidence and measured outcomes before changing copy.",
                ],
                "headlines": [],
                "bodies": [],
                "ctas": [],
            }

        if response_model.__name__ == "LPImprovementResult":
            return {
                "hero": [],
                "cta": [],
                "faq": [],
                "structure": [],
                "mobile_ui": [],
            }

        if response_model.__name__ == "DiffResult":
            allowed_paths = user_payload.get("allowed_paths", [])
            path = allowed_paths[0] if allowed_paths else "app/page.tsx"
            return {
                "files": [
                    {
                        "path": path,
                        "changes": [],
                    },
                ],
            }

        if response_model.__name__ == "ReviewResult":
            return {
                "exaggerated_claims": [],
                "brand_risks": [],
                "ui_risks": [],
                "dangerous_changes": [],
                "approved_for_pr": True,
            }

        if response_model.__name__ == "HistoryAwareRecommendation":
            features = user_payload.get("features", {})
            ad = user_payload.get("twitter_ad", {})
            lp = user_payload.get("landing_page", {})
            history = user_payload.get("history", [])
            demand = user_payload.get("demand_intelligence") or {}
            demand_summary = demand.get("summary") or {}
            is_ja = user_payload.get("locale") == "ja"
            pair_context = demand_summary.get("pair_analysis_context") or {}
            top_pain_clusters = demand_summary.get("top_pain_clusters") or []
            top_demand_signals = demand_summary.get("top_demand_signals") or []
            opportunities = demand_summary.get("opportunities") or []
            outcomes = user_payload.get("improvement_outcomes") or {}
            recent_outcomes = outcomes.get("recent_outcomes") or []
            successful_patterns = outcomes.get("successful_patterns") or []
            failed_patterns = outcomes.get("failed_patterns") or []
            inconclusive_patterns = outcomes.get("inconclusive_patterns") or []
            history_note = (
                "Recent edits exist, so test one field at a time."
                if history
                else "No prior edits are available, so treat this as an initial hypothesis."
            )
            return {
                "overall_diagnosis": "広告とLPの約束が一致しているかを、広範なコピー変更より先に検証すべきです。" if is_ja else "The ad and landing page should be tested for message match before broad copy changes.",
                "likely_problem": (
                    f"Hero similarityは{features.get('hero_similarity', 0)}、CTA strengthは{features.get('cta_strength', 0)}です。主なリスクは広告からLPへの期待値のズレです。"
                    if is_ja
                    else f"Hero similarity is {features.get('hero_similarity', 0)} and CTA strength is {features.get('cta_strength', 0)}, so the main risk is ad-to-LP promise mismatch."
                ),
                "history_based_insights": [
                    {
                        "finding": "変更履歴を次のテスト範囲の制約として扱うべきです。" if is_ja else "Change history should constrain the next test.",
                        "evidence": history_note,
                        "recommendation": "message matchを改善する最小のコピー変更を優先してください。" if is_ja else "Prioritize the smallest copy change that improves message match.",
                    },
                ],
                "ad_recommendations": [
                    {
                        "field": "headline",
                        "current_value": ad.get("headline") or "",
                        "suggested_value": lp.get("hero_title") or "Mirror the LP hero promise in the ad headline",
                        "reason": "新しい訴求を試す前に、広告のフックとLPファーストビューを揃えるためです。" if is_ja else "Align the ad hook with the first LP message before testing new claims.",
                        "expected_effect": "クリック後の期待値ズレと直帰リスクの低下。" if is_ja else "Higher click quality and lower bounce risk.",
                        "risk": "low",
                    },
                ],
                "lp_recommendations": [
                    {
                        "field": "primary_cta",
                        "current_value": lp.get("primary_cta") or "",
                        "suggested_value": ad.get("cta") or "Use the same CTA as the ad",
                        "reason": "広告クリックからLP上の行動までCTAを連続させるためです。" if is_ja else "CTA continuity reduces the handoff cost from ad click to LP action.",
                        "expected_effect": "CV導線の明確化。" if is_ja else "Improved conversion clarity.",
                        "risk": "low",
                    },
                ],
                "do_not_change": [
                    {
                        "field": "offer_text",
                        "reason": "現在の約束でmessage matchを測定するまで、オファー変更は避けます。" if is_ja else "Do not change the offer until message match is measured with the current promise.",
                    },
                ],
                "next_test_plan": {
                    "hypothesis": "広告見出しとLPヒーローを揃えると、期待値ズレによる直帰が下がる可能性があります。" if is_ja else "Matching ad headline and LP hero will reduce bounce from mismatched expectations.",
                    "test_target": "headline and primary_cta",
                    "success_metric": "bounce_rate and cvr",
                    "duration_days": 7,
                },
                "market_insights": [
                    *(pair_context.get("market_insights") or []),
                    {
                        "finding": "Demand intelligence should shape the next hypothesis, not decide demand.",
                        "evidence": ", ".join(str(item.get("name") or item) for item in top_pain_clusters[:3]) if top_pain_clusters else "No demand intelligence run is attached yet.",
                        "recommendation": "Compare the ad promise and LP first viewport against repeated pain and desire clusters.",
                    },
                ],
                "competitor_summary": pair_context.get("competitor_summary") or [],
                "pain_point_alignment": [
                    *(pair_context.get("pain_point_alignment") or []),
                    {
                        "finding": "Ad and LP should mention a concrete workflow pain.",
                        "evidence": str(top_pain_clusters[0].get("name")) if top_pain_clusters else "Pain clusters are not available.",
                        "recommendation": "Use the next copy test to connect the product promise to that pain explicitly.",
                    },
                ],
                "positioning_opportunities": pair_context.get("positioning_opportunities") or [],
                "market_alignment_score": pair_context.get("market_alignment_score") or (55 if demand else 0),
                "market_fit_analysis": (
                    pair_context.get("market_fit_analysis")
                    or (
                        "Demand intelligence materials are available and should be used as directional context for message fit."
                        if demand
                        else "No demand intelligence run is attached, so market fit analysis is limited to ad, LP, and history data."
                    )
                ),
                "recommended_positioning": pair_context.get("recommended_positioning") or ["Run demand intelligence before locking positioning."],
                "market_opportunities": pair_context.get("market_opportunities") or [str(item.get("name") or item) for item in opportunities[:5]],
                "feature_suggestions": pair_context.get("feature_suggestions") or [],
                "demand_signal_scores": pair_context.get("demand_signal_scores") or [
                    {"cluster": item.get("name"), "score": item.get("demand_signal_score")}
                    for item in top_demand_signals[:5]
                ],
                "trend_analysis": pair_context.get("trend_analysis") or [],
                "competitor_gaps": pair_context.get("competitor_gaps") or [],
                "root_causes": pair_context.get("root_causes") or [],
                "evidence_summary": pair_context.get("evidence_summary") or [],
                "validation_summary": pair_context.get("validation_summary") or {},
                "solution_fit_summary": pair_context.get("solution_fit_summary") or {},
                "monitoring_summary": pair_context.get("monitoring_summary") or {},
                "source_status_summary": pair_context.get("source_status_summary") or {},
                "search_demand_summary": pair_context.get("search_demand_summary") or {},
                "market_size_summary": pair_context.get("market_size_summary") or {},
                "outcome_learning_summary": pair_context.get("outcome_learning_summary") or {},
                "strong_validated_clusters": pair_context.get("strong_validated_clusters") or [],
                "weak_or_noisy_clusters": pair_context.get("weak_or_noisy_clusters") or [],
                "matched_solution_pains": pair_context.get("matched_solution_pains") or [],
                "unmatched_solution_pains": pair_context.get("unmatched_solution_pains") or [],
                "emerging_demand_signals": pair_context.get("emerging_demand_signals") or [],
                "growing_demand_signals": pair_context.get("growing_demand_signals") or [],
                "validated_demand_patterns": pair_context.get("validated_demand_patterns") or [],
                "failed_demand_patterns": pair_context.get("failed_demand_patterns") or [],
                "inconclusive_demand_patterns": pair_context.get("inconclusive_demand_patterns") or [],
                "promising_segments": pair_context.get("promising_segments") or [],
                "small_market_warnings": pair_context.get("small_market_warnings") or [],
                "recommended_next_tests": pair_context.get("recommended_next_tests") or [],
                "outcome_insights": [
                    {
                        "finding": "Past measured outcomes should constrain the next recommendation.",
                        "evidence": f"{len(recent_outcomes)} recent outcomes are available.",
                        "recommendation": "Prefer changes that can be measured against CTR, CVR, bounce rate, and engagement metrics.",
                    },
                ],
                "successful_improvement_patterns": [
                    str(item.get("title") or item.get("summary") or "Positive measured pattern")
                    for item in successful_patterns[:5]
                ],
                "failed_improvement_patterns": [
                    str(item.get("title") or item.get("summary") or "Negative measured pattern")
                    for item in failed_patterns[:5]
                ],
                "outcome_based_warnings": [
                    "Do not repeat negative measured patterns without a materially different hypothesis.",
                    *[
                        str(item.get("summary") or item.get("title"))
                        for item in inconclusive_patterns[:3]
                        if item.get("summary") or item.get("title")
                    ],
                ],
                "recommended_next_measurement": "Measure CTR, CVR, bounce_rate, session_duration, and scroll_depth after the next approved change.",
            }

        raise ValueError(f"Unsupported response model: {response_model.__name__}")
