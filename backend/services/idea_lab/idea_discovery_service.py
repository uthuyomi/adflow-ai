from __future__ import annotations

from typing import Any

from backend.services.evidence.evidence_service import EvidenceService
from backend.services.evidence.models import EvidenceCollectionRequest
from backend.services.idea_lab.models import IdeaDiscoverRequest
from backend.services.supabase.supabase_repository import SupabaseRepository


class IdeaDiscoveryService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository
        self.evidence_service = EvidenceService(repository=repository)

    def discover(self, *, user_id: str, request: IdeaDiscoverRequest) -> dict[str, Any]:
        evidence = self.evidence_service.collect(
            user_id=user_id,
            request=EvidenceCollectionRequest(
                project_id=None,
                query=request.query,
                sources=["mock", "search_stub", "reddit_stub", "competitor_stub", "github_stub"],
                max_items=80,
            ),
        ).model_dump(mode="json")
        opportunities = []
        for cluster in evidence["clusters"][: request.max_items]:
            opportunities.append(
                {
                    "title": f"Opportunity around {cluster.get('label')}",
                    "need": cluster.get("opportunity_score"),
                    "pain": cluster.get("severity_score"),
                    "competition": "Requires competitor validation",
                    "monetization": "Likely subscription or usage-based hypothesis",
                    "evidence": cluster.get("description"),
                },
            )
        return {"query": request.query, "top_opportunities": opportunities, "evidence_count": evidence["evidence_count"]}
