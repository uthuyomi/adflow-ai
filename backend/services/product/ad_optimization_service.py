from __future__ import annotations

from typing import Any

from backend.services.supabase.supabase_repository import SupabaseRepository


class AdOptimizationService:
    """User-facing facade for the Ad Optimization product area.

    This keeps the existing tables and lower-level services intact while
    presenting projects, assets, analysis targets, recommendations, results,
    and activity as one product workflow.
    """

    def __init__(self, repository: SupabaseRepository) -> None:
        self.repository = repository

    def list_projects(self, *, user_id: str) -> list[dict[str, Any]]:
        projects = self.repository.get_many("ad_projects", user_id=user_id, order="created_at.desc")
        ads = self.repository.get_many("twitter_ads", user_id=user_id)
        lps = self.repository.get_many("landing_pages", user_id=user_id)
        pairs = self.repository.get_many("ad_lp_pairs", user_id=user_id)
        outcomes = self.repository.get_many("improvement_outcomes", user_id=user_id)
        return [
            {
                **project,
                "ad_count": _count_by_project(ads, project["id"]),
                "landing_page_count": _count_by_project(lps, project["id"]),
                "analysis_target_count": _count_by_project(pairs, project["id"]),
                "result_count": _count_by_project(outcomes, project["id"]),
            }
            for project in projects
        ]

    def get_project_overview(self, *, user_id: str, project_id: str) -> dict[str, Any]:
        project = self.repository.get_one("ad_projects", user_id=user_id, filters={"id": project_id})
        assets = self.get_project_assets(user_id=user_id, project_id=project_id)
        analysis_targets = self.repository.get_many(
            "ad_lp_pairs",
            user_id=user_id,
            filters={"project_id": project_id},
            order="updated_at.desc",
        )
        recommendations = self.get_project_recommendations(user_id=user_id, project_id=project_id)
        results = self.get_project_results(user_id=user_id, project_id=project_id)
        activity = self.repository.get_many(
            "change_history",
            user_id=user_id,
            filters={"project_id": project_id},
            order="created_at.desc",
            limit=50,
        )
        return {
            "project": project,
            "assets": assets,
            "analysis_targets": analysis_targets,
            "recommendations": recommendations,
            "results": results,
            "activity": activity,
        }

    def get_project_assets(self, *, user_id: str, project_id: str) -> dict[str, list[dict[str, Any]]]:
        return {
            "ads": self.repository.get_many(
                "twitter_ads",
                user_id=user_id,
                filters={"project_id": project_id},
                order="created_at.desc",
            ),
            "landing_pages": self.repository.get_many(
                "landing_pages",
                user_id=user_id,
                filters={"project_id": project_id},
                order="created_at.desc",
            ),
        }

    def get_project_recommendations(self, *, user_id: str, project_id: str) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "analysis_runs",
            user_id=user_id,
            filters={"project_id": project_id},
            order="created_at.desc",
            limit=50,
        )

    def get_project_results(self, *, user_id: str, project_id: str) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "improvement_outcomes",
            user_id=user_id,
            filters={"project_id": project_id},
            order="created_at.desc",
            limit=50,
        )


def _count_by_project(rows: list[dict[str, Any]], project_id: str) -> int:
    return sum(1 for row in rows if row.get("project_id") == project_id)
