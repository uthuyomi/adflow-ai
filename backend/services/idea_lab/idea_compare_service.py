from __future__ import annotations

from backend.services.idea_lab.models import IdeaCompareRequest


class IdeaCompareService:
    def compare(self, *, request: IdeaCompareRequest) -> dict[str, object]:
        comparisons = []
        for idea in request.ideas:
            text = " ".join(str(value) for value in idea.values()).lower()
            comparisons.append(
                {
                    "title": idea.get("title") or text[:60] or "Idea",
                    "need": self._score(text, ["pain", "problem", "困", "manual"], 55),
                    "competition": self._score(text, ["competitor", "alternative", "既存"], 45),
                    "monetization": self._score(text, ["pricing", "paid", "subscription", "課金"], 45),
                    "complexity": "medium" if any(word in text for word in ["ai", "api", "automation"]) else "low",
                    "evidence": "Comparison is directional until each idea has its own review run.",
                },
            )
        return {
            "summary": "No winner is declared. Use the report to decide which hypothesis deserves the next validation step.",
            "ideas": comparisons,
        }

    @staticmethod
    def _score(text: str, keywords: list[str], base: int) -> int:
        return min(95, base + sum(8 for keyword in keywords if keyword in text))
