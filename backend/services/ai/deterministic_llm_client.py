from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class DeterministicLLMClient:
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
                    "CTR is declining on the selected segment.",
                    "The ad hook is less specific than the landing page value.",
                ],
                "suggestions": [
                    "Make the outcome concrete in the headline.",
                    "Align the CTA with the landing page hero promise.",
                ],
                "headlines": [
                    "Create 50 Google Maps routes in 30 seconds",
                    "Turn address lists into routes faster",
                ],
                "bodies": [
                    "Upload addresses and generate route-ready maps without manual sorting.",
                    "Reduce repetitive route setup work for field teams.",
                ],
                "ctas": ["Try route automation", "Create routes faster"],
            }

        if response_model.__name__ == "LPImprovementResult":
            return {
                "hero": ["Replace abstract hero copy with a measurable workflow outcome."],
                "cta": ["Use one primary CTA above the fold and repeat it after proof points."],
                "faq": ["Add FAQ items for import limits, supported formats, and setup time."],
                "structure": ["Move proof points before secondary feature details."],
                "mobile_ui": ["Keep the first mobile viewport focused on title, proof, and CTA."],
            }

        if response_model.__name__ == "DiffResult":
            allowed_paths = user_payload.get("allowed_paths", [])
            path = allowed_paths[0] if allowed_paths else "app/page.tsx"
            return {
                "files": [
                    {
                        "path": path,
                        "changes": [
                            {
                                "before": "Create routes easily",
                                "after": "Turn 50 addresses into Google Maps routes in 30 seconds",
                            },
                        ],
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
            market = user_payload.get("market_research") or {}
            market_summary = market.get("summary") or {}
            main_pain_points = market_summary.get("main_pain_points") or []
            main_competitors = market_summary.get("main_competitors") or []
            opportunities = market_summary.get("opportunities") or []
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
                "overall_diagnosis": "The ad and landing page should be tested for message match before broad copy changes.",
                "likely_problem": (
                    f"Hero similarity is {features.get('hero_similarity', 0)} and CTA strength is "
                    f"{features.get('cta_strength', 0)}, so the main risk is ad-to-LP promise mismatch."
                ),
                "history_based_insights": [
                    {
                        "finding": "Change history should constrain the next test.",
                        "evidence": history_note,
                        "recommendation": "Prioritize the smallest copy change that improves message match.",
                    },
                ],
                "ad_recommendations": [
                    {
                        "field": "headline",
                        "current_value": ad.get("headline") or "",
                        "suggested_value": lp.get("hero_title") or "Mirror the LP hero promise in the ad headline",
                        "reason": "Align the ad hook with the first LP message before testing new claims.",
                        "expected_effect": "Higher click quality and lower bounce risk.",
                        "risk": "low",
                    },
                ],
                "lp_recommendations": [
                    {
                        "field": "primary_cta",
                        "current_value": lp.get("primary_cta") or "",
                        "suggested_value": ad.get("cta") or "Use the same CTA as the ad",
                        "reason": "CTA continuity reduces the handoff cost from ad click to LP action.",
                        "expected_effect": "Improved conversion clarity.",
                        "risk": "low",
                    },
                ],
                "do_not_change": [
                    {
                        "field": "offer_text",
                        "reason": "Do not change the offer until message match is measured with the current promise.",
                    },
                ],
                "next_test_plan": {
                    "hypothesis": "Matching ad headline and LP hero will reduce bounce from mismatched expectations.",
                    "test_target": "headline and primary_cta",
                    "success_metric": "bounce_rate and cvr",
                    "duration_days": 7,
                },
                "market_insights": [
                    {
                        "finding": "Market research should shape the next hypothesis, not decide demand.",
                        "evidence": ", ".join(main_pain_points[:3]) if main_pain_points else "No market research run is attached yet.",
                        "recommendation": "Compare the ad promise and LP first viewport against the most repeated market pains.",
                    },
                ],
                "competitor_summary": main_competitors[:5],
                "pain_point_alignment": [
                    {
                        "finding": "Ad and LP should mention a concrete workflow pain.",
                        "evidence": str(main_pain_points[0]) if main_pain_points else "Market pain points are not available.",
                        "recommendation": "Use the next copy test to connect the product promise to that pain explicitly.",
                    },
                ],
                "positioning_opportunities": opportunities[:5],
                "market_alignment_score": 55 if market else 0,
                "market_fit_analysis": (
                    "Market research materials are available and should be used as directional context for message fit."
                    if market
                    else "No market research run is attached, so market fit analysis is limited to ad, LP, and history data."
                ),
                "recommended_positioning": opportunities[:3] or ["Run market research before locking positioning."],
                "market_opportunities": opportunities[:5],
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
