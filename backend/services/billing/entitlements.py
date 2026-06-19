from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from backend.services.supabase.supabase_repository import SupabaseRepository

PlanId = Literal["free", "starter", "growth", "business"]

PLAN_RANK: dict[PlanId, int] = {
    "free": 0,
    "starter": 1,
    "growth": 2,
    "business": 3,
}

FEATURE_MINIMUM_PLANS: dict[str, PlanId] = {
    "pair_analysis": "starter",
    "experiment_create": "growth",
}

FREE_SAVED_ITEM_LIMIT = 10
SAVED_ITEM_TABLES = (
    "ad_projects",
    "twitter_ads",
    "landing_pages",
    "ad_lp_pairs",
    "demand_discovery_sessions",
)


@dataclass(frozen=True)
class PlanEntitlements:
    plan: PlanId
    saved_item_limit: int | None
    pair_analysis: bool
    experiment_create: bool


class PlanAccessError(ValueError):
    def __init__(
        self,
        *,
        code: str,
        message: str,
        current_plan: PlanId,
        required_plan: PlanId | None = None,
        feature: str | None = None,
        limit: int | None = None,
        current_usage: int | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.current_plan = current_plan
        self.required_plan = required_plan
        self.feature = feature
        self.limit = limit
        self.current_usage = current_usage

    def detail(self) -> dict[str, Any]:
        return {
            "error": self.code,
            "message": self.message,
            "currentPlan": self.current_plan,
            "requiredPlan": self.required_plan,
            "feature": self.feature,
            "limit": self.limit,
            "currentUsage": self.current_usage,
            "pricingUrl": "/pricing",
        }


class PlanEntitlementService:
    def __init__(self, repository: SupabaseRepository) -> None:
        self.repository = repository

    def get_entitlements(self, *, user_id: str) -> PlanEntitlements:
        plan = self.get_effective_plan(user_id=user_id)
        return PlanEntitlements(
            plan=plan,
            saved_item_limit=FREE_SAVED_ITEM_LIMIT if plan == "free" else None,
            pair_analysis=self._allows(plan, "pair_analysis"),
            experiment_create=self._allows(plan, "experiment_create"),
        )

    def get_effective_plan(self, *, user_id: str) -> PlanId:
        profiles = self.repository.get_many("user_billing_profiles", user_id=user_id, limit=1)
        if not profiles:
            return "free"
        profile = profiles[0]
        plan = str(profile.get("plan") or "free").lower()
        status = str(profile.get("subscription_status") or "inactive").lower()
        if plan not in PLAN_RANK or plan == "free":
            return "free"
        return plan if status in {"active", "trialing"} else "free"  # type: ignore[return-value]

    def require_feature(self, *, user_id: str, feature: str) -> PlanId:
        required_plan = FEATURE_MINIMUM_PLANS[feature]
        current_plan = self.get_effective_plan(user_id=user_id)
        if not self._allows(current_plan, feature):
            raise PlanAccessError(
                code="PLAN_UPGRADE_REQUIRED",
                message=f"{required_plan.title()} plan or higher is required for this feature.",
                current_plan=current_plan,
                required_plan=required_plan,
                feature=feature,
            )
        return current_plan

    def require_saved_item_capacity(self, *, user_id: str, additional_items: int = 1) -> int:
        if additional_items <= 0:
            return self.saved_item_count(user_id=user_id)
        current_plan = self.get_effective_plan(user_id=user_id)
        if current_plan != "free":
            return self.saved_item_count(user_id=user_id)
        current_usage = self.saved_item_count(user_id=user_id)
        if current_usage + additional_items > FREE_SAVED_ITEM_LIMIT:
            raise PlanAccessError(
                code="PLAN_LIMIT_REACHED",
                message=f"Free plan supports up to {FREE_SAVED_ITEM_LIMIT} saved items.",
                current_plan=current_plan,
                required_plan="starter",
                feature="saved_items",
                limit=FREE_SAVED_ITEM_LIMIT,
                current_usage=current_usage,
            )
        return current_usage

    def saved_item_count(self, *, user_id: str) -> int:
        return sum(
            (
                self._count("ad_projects", user_id, {"status": status})
                for status in ("ACTIVE", "PAUSED", "ARCHIVED")
            ),
            start=0,
        ) + sum(
            (
                self._count("demand_discovery_sessions", user_id, {"status": status})
                for status in ("active", "archived")
            ),
            start=0,
        ) + sum(
            self._count(table, user_id)
            for table in ("twitter_ads", "landing_pages", "ad_lp_pairs")
        )

    def _count(self, table: str, user_id: str, filters: dict[str, Any] | None = None) -> int:
        count = getattr(self.repository, "count", None)
        if callable(count):
            return int(count(table, user_id=user_id, filters=filters))
        return len(self.repository.get_many(table, user_id=user_id, filters=filters, select="id"))

    @staticmethod
    def _allows(plan: PlanId, feature: str) -> bool:
        return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_MINIMUM_PLANS[feature]]
