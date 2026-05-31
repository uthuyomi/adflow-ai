from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.core.config import Settings
from backend.services.evidence.evidence_service import EvidenceService
from backend.services.evidence.models import EvidenceCollectionRequest
from backend.services.outcomes.improvement_outcome_service import ImprovementOutcomeService
from backend.services.product_intelligence.roadmap_service import ProductRoadmapService
from backend.services.product_review.backlog_service import ProductBacklogService
from backend.services.product_review.models import ProductReviewRequest
from backend.services.product_review.product_profile_service import ProductProfileService
from backend.services.product_review.product_review_ai_service import ProductReviewAIService
from backend.services.product_review.product_scoring_service import ProductScoringService
from backend.services.supabase.supabase_repository import SupabaseRepository


class ProductReviewService:
    def __init__(self, *, repository: SupabaseRepository, settings: Settings | None = None) -> None:
        self.repository = repository
        self.settings = settings
        self.evidence_service = EvidenceService(repository=repository, settings=settings)
        self.profile_service = ProductProfileService(repository=repository)
        self.scoring_service = ProductScoringService()
        self.ai_service = ProductReviewAIService()
        self.backlog_service = ProductBacklogService(repository=repository)
        self.roadmap_service = ProductRoadmapService(repository=repository)
        self.outcome_service = ImprovementOutcomeService(repository=repository)

    def run_product_review(self, *, user_id: str, request: ProductReviewRequest) -> dict[str, Any]:
        if not request.query.strip():
            raise ValueError("query is required.")
        run = self.repository.insert(
            "product_review_runs",
            {
                "user_id": user_id,
                "project_id": request.project_id,
                "ad_lp_pair_id": request.ad_lp_pair_id,
                "query": request.query.strip(),
                "status": "collecting",
                "review_mode": request.review_mode,
                "evidence_collection_mode": request.evidence_collection_mode,
            },
        )
        try:
            sources = ["mock"]
            if request.manual_evidence_items:
                sources.insert(0, "manual")
            if request.evidence_collection_mode in {"web_stub", "manual_or_mock"}:
                sources.append("web_stub")
            evidence_result = self.evidence_service.collect(
                user_id=user_id,
                request=EvidenceCollectionRequest(
                    project_id=request.project_id,
                    ad_lp_pair_id=request.ad_lp_pair_id,
                    product_review_run_id=run["id"],
                    query=request.query,
                    sources=sources,
                    max_items=request.max_evidence_items,
                    manual_items=request.manual_evidence_items,
                ),
            )
            self.repository.update(
                "product_review_runs",
                user_id=user_id,
                filters={"id": run["id"]},
                payload={"status": "analyzing", "evidence_count": evidence_result.evidence_count, "cluster_count": evidence_result.cluster_count},
            )
            profile = self.profile_service.get_by_project(user_id=user_id, project_id=request.project_id)
            pair = self._pair_context(user_id=user_id, pair_id=request.ad_lp_pair_id)
            outcomes = (
                self.outcome_service.get_outcome_context_for_analysis(user_id=user_id, pair_id=request.ad_lp_pair_id)
                if request.ad_lp_pair_id
                else None
            )
            score = self.scoring_service.score(
                evidence_count=evidence_result.evidence_count,
                clusters=evidence_result.clusters,
                pair=pair,
                product_profile=profile,
            )
            review = self.ai_service.generate(
                query=request.query,
                product_profile=profile,
                clusters=evidence_result.clusters,
                evidence=evidence_result.sources,
                outcomes=outcomes,
                review_mode=request.review_mode,
            )
            updated = self.repository.update(
                "product_review_runs",
                user_id=user_id,
                filters={"id": run["id"]},
                payload={
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    **score.model_dump(mode="json"),
                    "summary": review.model_dump(mode="json", exclude={"backlog_items"}),
                    "recommendations": {
                        "backlog_note": "Product Review results are backlog candidates, not immediate implementation instructions.",
                        "system_instruction": "No success, demand, or revenue verdicts are generated.",
                    },
                    "roadmap_candidates": review.roadmap_candidates,
                    "do_not_build": review.do_not_build,
                },
            )
            backlog_items = self.backlog_service.create_from_candidates(
                user_id=user_id,
                project_id=request.project_id,
                ad_lp_pair_id=request.ad_lp_pair_id,
                product_review_run_id=run["id"],
                candidates=review.backlog_items,
            )
            roadmap = self.roadmap_service.generate(
                user_id=user_id,
                project_id=request.project_id,
                product_review_run_id=run["id"],
                title=f"Roadmap from {request.review_mode} product review",
            )
            return {**updated, "backlog_items": backlog_items, "clusters": evidence_result.clusters, "roadmap": roadmap}
        except Exception:
            self.repository.update(
                "product_review_runs",
                user_id=user_id,
                filters={"id": run["id"]},
                payload={"status": "failed", "updated_at": datetime.now(timezone.utc).isoformat()},
            )
            raise

    def get_product_review_run(self, *, user_id: str, run_id: str) -> dict[str, Any]:
        run = self.repository.get_one("product_review_runs", user_id=user_id, filters={"id": run_id})
        return self._hydrate(user_id=user_id, run=run)

    def list_product_review_runs(self, *, user_id: str, project_id: str, limit: int = 30) -> list[dict[str, Any]]:
        runs = self.repository.get_many(
            "product_review_runs",
            user_id=user_id,
            filters={"project_id": project_id},
            order="created_at.desc",
            limit=limit,
        )
        return [self._hydrate(user_id=user_id, run=run) for run in runs]

    def get_latest_product_review(
        self,
        *,
        user_id: str,
        project_id: str,
        pair_id: str | None = None,
    ) -> dict[str, Any]:
        filters = {"project_id": project_id}
        if pair_id:
            filters["ad_lp_pair_id"] = pair_id
        runs = self.repository.get_many(
            "product_review_runs",
            user_id=user_id,
            filters=filters,
            order="created_at.desc",
            limit=1,
        )
        if not runs:
            raise ValueError("No product review run was found.")
        return self._hydrate(user_id=user_id, run=runs[0])

    def latest_context_for_pair(self, *, user_id: str, project_id: str | None, pair_id: str) -> dict[str, Any] | None:
        if not project_id:
            return None
        try:
            latest = self.get_latest_product_review(user_id=user_id, project_id=project_id, pair_id=pair_id)
        except ValueError:
            return None
        clusters = self.evidence_service.list_clusters(user_id=user_id, pair_id=pair_id, limit=8)
        backlog = self.backlog_service.list_for_project(user_id=user_id, project_id=project_id, limit=20)
        return {
            "latest_product_review": latest,
            "top_evidence_clusters": clusters,
            "high_priority_backlog_items": [
                item for item in backlog if item.get("priority") in {"critical", "high"} and item.get("status") not in {"rejected", "converted_to_codex_task"}
            ][:8],
        }

    def _hydrate(self, *, user_id: str, run: dict[str, Any]) -> dict[str, Any]:
        clusters = self.repository.get_many(
            "evidence_clusters",
            user_id=user_id,
            filters={"product_review_run_id": run["id"]},
            order="evidence_count.desc",
            limit=30,
        )
        backlog = self.repository.get_many(
            "product_improvement_backlog",
            user_id=user_id,
            filters={"product_review_run_id": run["id"]},
            order="created_at.desc",
            limit=50,
        )
        return {**run, "clusters": clusters, "backlog_items": backlog}

    def _pair_context(self, *, user_id: str, pair_id: str | None) -> dict[str, Any] | None:
        if not pair_id:
            return None
        pair = self.repository.get_one("ad_lp_pairs", user_id=user_id, filters={"id": pair_id})
        try:
            pair["twitter_ads"] = self.repository.get_one("twitter_ads", user_id=user_id, filters={"id": pair["twitter_ad_id"]})
            pair["landing_pages"] = self.repository.get_one("landing_pages", user_id=user_id, filters={"id": pair["landing_page_id"]})
        except ValueError:
            pass
        return pair
