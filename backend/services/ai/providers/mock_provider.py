from __future__ import annotations

from typing import Any


class MockProvider:
    provider_key = "mock"

    def is_configured(self) -> bool:
        return True

    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, Any],
        schema: dict[str, Any],
    ) -> dict[str, Any]:
        task = user_payload.get("task", "analysis")
        provider = user_payload.get("provider", "mock")
        message_match = float(user_payload.get("message_match_score") or 0)
        confidence = 0.72 if message_match >= 45 else 0.58
        return {
            "summary": f"{provider} mock proposal for {task}.",
            "findings": [
                f"Message match score is {message_match}.",
                "Provider env is not configured or real provider failed; mock fallback was used.",
            ],
            "recommendations": [
                "Keep ad and LP promise aligned before broad creative changes.",
                "Change one field at a time so history remains readable.",
            ],
            "score": message_match,
            "risk_level": "medium" if message_match < 45 else "low",
            "next_action": "Review this proposal before marking apply-ready.",
            "confidence": confidence,
            "predicted_effect": {
                "ctr_lift": 2.0 if task == "twitter_ad_improvement" else 0.5,
                "cvr_lift": 1.2 if task == "lp_review" else 0.4,
                "bounce_reduction": 3.0 if message_match < 45 else 1.0,
                "notes": "Estimated from rule-based mock output.",
            },
        }
