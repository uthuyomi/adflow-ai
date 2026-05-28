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

        raise ValueError(f"Unsupported response model: {response_model.__name__}")
