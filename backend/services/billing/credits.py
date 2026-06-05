from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from backend.services.supabase.supabase_repository import SupabaseRepository


class InsufficientCreditsError(ValueError):
    def __init__(self, *, required_credits: int, current_credits: int) -> None:
        super().__init__("INSUFFICIENT_CREDITS")
        self.required_credits = required_credits
        self.current_credits = current_credits


@dataclass(frozen=True)
class CreditCost:
    amount: int
    reason: str


CREDIT_COSTS: dict[str, CreditCost] = {
    "workflow_run": CreditCost(300, "FULL_ANALYSIS_PACK"),
    "pair_analysis": CreditCost(80, "COMPETITOR_ANALYSIS"),
    "demand_intelligence": CreditCost(50, "DEMAND_ANALYSIS"),
    "demand_solution_fit": CreditCost(120, "PRODUCT_IDEA_CONVERSION"),
    "outcome_learning_rebuild": CreditCost(20, "LIGHT_DEMAND_SCAN"),
    "codex_task": CreditCost(100, "LP_OUTLINE_GENERATION"),
}


class CreditService:
    def __init__(self, repository: SupabaseRepository) -> None:
        self.repository = repository

    def get_balance(self, user_id: str) -> dict[str, Any]:
        balance = self.repository.rpc("ensure_credit_balance", {"p_user_id": user_id})
        return self._normalize_balance(balance)

    def has_enough(self, user_id: str, amount: int) -> tuple[bool, int]:
        balance = self.get_balance(user_id)
        total = int(balance["monthly_credits"]) + int(balance["purchased_credits"])
        return total >= amount, total

    def ensure_available(
        self,
        user_id: str,
        amount: int,
        *,
        auto_top_up_amount: int | None = None,
        reason: str = "auto_top_up",
    ) -> dict[str, Any]:
        balance = self.get_balance(user_id)
        total = int(balance["monthly_credits"]) + int(balance["purchased_credits"])
        if total >= amount:
            return balance
        if not auto_top_up_amount or auto_top_up_amount <= 0:
            raise InsufficientCreditsError(required_credits=amount, current_credits=total)

        top_up_amount = max(auto_top_up_amount, amount - total)
        return self.add_purchased_credits(user_id=user_id, amount=top_up_amount, reason=reason)

    def add_purchased_credits(self, user_id: str, amount: int, reason: str) -> dict[str, Any]:
        balance = self.repository.rpc(
            "add_purchased_credits",
            {
                "p_user_id": user_id,
                "p_amount": amount,
                "p_reason": reason,
                "p_stripe_event_id": None,
            },
        )
        return self._normalize_balance(balance)

    def consume(self, user_id: str, amount: int, reason: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        enough, total = self.has_enough(user_id, amount)
        if not enough:
            raise InsufficientCreditsError(required_credits=amount, current_credits=total)
        try:
            balance = self.repository.rpc(
                "consume_user_credits",
                {
                    "p_user_id": user_id,
                    "p_amount": amount,
                    "p_reason": reason,
                    "p_metadata": metadata or {},
                },
            )
        except ValueError as exc:
            if "INSUFFICIENT_CREDITS" in str(exc):
                raise InsufficientCreditsError(required_credits=amount, current_credits=total) from exc
            raise
        return self._normalize_balance(balance)

    @staticmethod
    def _normalize_balance(balance: dict[str, Any]) -> dict[str, Any]:
        monthly = int(balance.get("monthly_credits") or 0)
        purchased = int(balance.get("purchased_credits") or 0)
        return {
            **balance,
            "monthly_credits": monthly,
            "purchased_credits": purchased,
            "total_credits": monthly + purchased,
            "lifetime_used_credits": int(balance.get("lifetime_used_credits") or 0),
        }
