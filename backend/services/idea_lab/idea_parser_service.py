from __future__ import annotations

import re
from typing import Any


class IdeaParserService:
    def parse(self, *, messages: list[dict[str, Any]], existing_profile: dict[str, Any] | None = None) -> dict[str, Any]:
        text = "\n".join(str(message.get("content") or "") for message in messages if message.get("role") == "user")
        lower = text.lower()
        existing = existing_profile or {}
        title = existing.get("title") or self._title(text)
        target_users = self._after_keywords(text, ["for ", "向け", "対象", "ユーザー"]) or existing.get("target_users")
        problem = self._sentence_with(lower, ["problem", "pain", "困", "面倒", "課題", "悩"]) or existing.get("problem_statement")
        solution = self._sentence_with(text, ["tool", "app", "solution", "作", "サービス", "機能"]) or existing.get("proposed_solution")
        monetization = self._sentence_with(lower, ["subscription", "pricing", "charge", "paid", "課金", "料金", "サブスク"]) or existing.get("monetization_model")
        constraints = self._sentence_with(lower, ["constraint", "limit", "without", "制約", "避け", "できない"]) or existing.get("constraints")
        return {
            "title": title or "Untitled idea",
            "target_users": target_users or "Users with the described problem",
            "problem_statement": problem or "The problem is still being clarified through conversation.",
            "proposed_solution": solution or text[:240] or "A solution concept is still being clarified.",
            "market_category": existing.get("market_category") or self._market_category(lower),
            "monetization_model": monetization or "Monetization is not validated yet.",
            "estimated_complexity": existing.get("estimated_complexity") or self._complexity(lower),
            "constraints": constraints,
            "notes": text[-1000:],
        }

    @staticmethod
    def _title(text: str) -> str:
        clean = re.sub(r"\s+", " ", text).strip()
        if not clean:
            return "Untitled idea"
        return clean[:70]

    @staticmethod
    def _after_keywords(text: str, keywords: list[str]) -> str | None:
        for keyword in keywords:
            if keyword in text:
                return text.split(keyword, 1)[-1].strip()[:160]
        return None

    @staticmethod
    def _sentence_with(text: str, keywords: list[str]) -> str | None:
        for sentence in re.split(r"[。\n.!?]", text):
            if any(keyword in sentence for keyword in keywords):
                return sentence.strip()[:260]
        return None

    @staticmethod
    def _market_category(lower: str) -> str:
        if any(word in lower for word in ["ad", "lp", "marketing", "広告"]):
            return "marketing"
        if any(word in lower for word in ["schedule", "calendar", "予定"]):
            return "productivity"
        if any(word in lower for word in ["developer", "github", "api"]):
            return "developer tool"
        return "general software"

    @staticmethod
    def _complexity(lower: str) -> str:
        if any(word in lower for word in ["ai", "automation", "api", "realtime"]):
            return "medium"
        return "low"
