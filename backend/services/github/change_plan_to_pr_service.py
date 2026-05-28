from __future__ import annotations

from typing import Any


class ChangePlanToPRService:
    def build_implementation_plan(self, ai_result: dict[str, Any]) -> dict[str, Any]:
        output = ai_result.get("output") or {}
        return {
            "source_ai_result_id": ai_result["id"],
            "title": output.get("summary") or ai_result.get("task") or "Approved AI proposal",
            "recommendations": output.get("recommendations") or [],
            "risk_level": ai_result.get("risk_level"),
            "decision_status": ai_result.get("decision_status"),
            "target_files_hint": ["frontend/app/...", "frontend/components/..."],
        }
