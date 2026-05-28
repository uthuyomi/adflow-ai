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
            }

        raise ValueError(f"Unsupported response model: {response_model.__name__}")
