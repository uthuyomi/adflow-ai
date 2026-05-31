from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.services.idea_lab.idea_backlog_service import IdeaBacklogService
from backend.services.idea_lab.idea_research_service import IdeaResearchService
from backend.services.idea_lab.idea_roadmap_service import IdeaRoadmapService
from backend.services.idea_lab.idea_scoring_service import IdeaScoringService
from backend.services.idea_lab.models import IdeaReviewRequest
from backend.services.idea_lab.session_service import IdeaSessionService
from backend.services.supabase.supabase_repository import SupabaseRepository


class IdeaReviewService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository
        self.sessions = IdeaSessionService(repository=repository)
        self.research = IdeaResearchService(repository=repository)
        self.scoring = IdeaScoringService()
        self.backlog = IdeaBacklogService(repository=repository)
        self.roadmap = IdeaRoadmapService(repository=repository)

    def run(self, *, user_id: str, request: IdeaReviewRequest) -> dict[str, Any]:
        session = self.sessions.get(user_id=user_id, session_id=request.session_id)
        profile = session.get("profile")
        if not profile:
            raise ValueError("Idea profile is required before review.")
        review = self.repository.insert(
            "idea_review_runs",
            {"user_id": user_id, "session_id": request.session_id, "status": "researching"},
        )
        evidence = self.research.collect(
            user_id=user_id,
            session_id=request.session_id,
            query=self._query(profile),
            max_items=request.max_evidence_items,
        )
        clusters = self.research.clusters(user_id=user_id, session_id=request.session_id)
        score = self.scoring.score(profile=profile, clusters=clusters, evidence_count=evidence["evidence_count"])
        mvp_plan = self._mvp(profile=profile, clusters=clusters)
        summary = {
            "need": "Need is estimated from evidence volume and pain clusters.",
            "pain": [cluster.get("label") for cluster in clusters if cluster.get("cluster_type") in {"pain", "ux_issue"}][:5],
            "competition": [cluster.get("label") for cluster in clusters if cluster.get("cluster_type") == "competitor"][:5],
            "monetization": profile.get("monetization_model"),
            "implementation": profile.get("estimated_complexity"),
            "evidence_confidence_note": "Evidence is directional and does not prove demand or success.",
        }
        updated = self.repository.update(
            "idea_review_runs",
            user_id=user_id,
            filters={"id": review["id"]},
            payload={
                "status": "completed",
                **score.model_dump(mode="json"),
                "summary": summary,
                "mvp_plan": mvp_plan,
                "evidence_count": evidence["evidence_count"],
                "cluster_count": evidence["cluster_count"],
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        backlog = self.backlog.generate(
            user_id=user_id,
            session_id=request.session_id,
            review_run_id=review["id"],
            mvp_plan=mvp_plan,
            evidence_count=evidence["evidence_count"],
        )
        roadmap = self.roadmap.generate(user_id=user_id, session_id=request.session_id, review_run_id=review["id"])
        return {**updated, "backlog_items": backlog, "roadmap": roadmap, "clusters": clusters}

    def latest(self, *, user_id: str, session_id: str) -> dict[str, Any]:
        rows = self.repository.get_many("idea_review_runs", user_id=user_id, filters={"session_id": session_id}, order="created_at.desc", limit=1)
        if not rows:
            raise ValueError("No idea review was found.")
        return rows[0]

    @staticmethod
    def _query(profile: dict[str, Any]) -> str:
        return " ".join(
            str(profile.get(key) or "")
            for key in ["title", "target_users", "problem_statement", "proposed_solution", "market_category"]
        ).strip() or "idea validation"

    @staticmethod
    def _mvp(*, profile: dict[str, Any], clusters: list[dict[str, Any]]) -> dict[str, Any]:
        pain_labels = [str(cluster.get("label")) for cluster in clusters if cluster.get("cluster_type") in {"pain", "ux_issue"}]
        return {
            "must_have": [
                f"Solve core problem: {profile.get('problem_statement')}",
                "Basic onboarding to first value",
                *(pain_labels[:2] or ["Evidence-backed core workflow"]),
            ],
            "should_have": ["Simple pricing validation", "Landing page smoke test", "Feedback capture"],
            "do_not_build": ["Social features", "Broad automation before validation", "Revenue claims in copy"],
        }
