from __future__ import annotations

from typing import Any

from backend.core.config import Settings
from backend.services.evidence.clustering_service import EvidenceClusteringService
from backend.services.evidence.collectors import collector_for
from backend.services.evidence.embedding_service import EvidenceEmbeddingService
from backend.services.evidence.models import (
    EvidenceCollectionRequest,
    EvidenceCollectionResult,
    EvidenceSearchRequest,
    EvidenceSearchResult,
)
from backend.services.evidence.normalizer import EvidenceNormalizer
from backend.services.supabase.supabase_repository import SupabaseRepository


class EvidenceService:
    def __init__(self, *, repository: SupabaseRepository, settings: Settings | None = None) -> None:
        self.repository = repository
        self.settings = settings
        self.normalizer = EvidenceNormalizer()
        self.embedding_service = EvidenceEmbeddingService(settings)
        self.clustering_service = EvidenceClusteringService()

    def collect(self, *, user_id: str, request: EvidenceCollectionRequest) -> EvidenceCollectionResult:
        if not request.query.strip():
            raise ValueError("query is required.")
        raw_sources = []
        for source_name in request.sources:
            raw_sources.extend(collector_for(source_name).collect(request))
            if len(raw_sources) >= request.max_items:
                break
        normalized = self.normalizer.normalize(raw_sources[: request.max_items], query=request.query)
        inserted_sources: list[dict[str, Any]] = []
        for source in normalized.sources:
            inserted_sources.append(
                self.repository.insert(
                    "evidence_sources",
                    {"user_id": user_id, **source.model_dump(mode="json", exclude_none=True)},
                ),
            )
        texts = [
            str(source.get("normalized_content") or source.get("raw_content") or "")
            for source in inserted_sources
        ]
        vectors = self.embedding_service.embed_texts(texts) if texts else []
        inserted_embeddings = []
        for source, vector in zip(inserted_sources, vectors, strict=False):
            inserted_embeddings.append(
                self.repository.insert(
                    "evidence_embeddings",
                    {
                        "user_id": user_id,
                        "evidence_source_id": source["id"],
                        "provider": self.embedding_service.provider,
                        "model": self.embedding_service.model,
                        "dimensions": len(vector),
                        "embedding": vector,
                    },
                ),
            )
        clusters = self.clustering_service.cluster(inserted_sources, vectors)
        inserted_clusters = [
            self.repository.insert(
                "evidence_clusters",
                {"user_id": user_id, **cluster.model_dump(mode="json", exclude_none=True)},
            )
            for cluster in clusters
        ]
        return EvidenceCollectionResult(
            status="completed",
            evidence_count=len(inserted_sources),
            embedding_count=len(inserted_embeddings),
            cluster_count=len(inserted_clusters),
            sources=inserted_sources,
            clusters=inserted_clusters,
        )

    def list_by_project(self, *, user_id: str, project_id: str, limit: int = 100) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "evidence_sources",
            user_id=user_id,
            filters={"project_id": project_id},
            order="created_at.desc",
            limit=limit,
        )

    def list_by_pair(self, *, user_id: str, pair_id: str, limit: int = 100) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "evidence_sources",
            user_id=user_id,
            filters={"ad_lp_pair_id": pair_id},
            order="created_at.desc",
            limit=limit,
        )

    def list_clusters(
        self,
        *,
        user_id: str,
        project_id: str | None = None,
        pair_id: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        filters: dict[str, Any] = {}
        if project_id:
            filters["project_id"] = project_id
        if pair_id:
            filters["ad_lp_pair_id"] = pair_id
        return self.repository.get_many(
            "evidence_clusters",
            user_id=user_id,
            filters=filters,
            order="evidence_count.desc",
            limit=limit,
        )

    def search(self, *, user_id: str, request: EvidenceSearchRequest) -> EvidenceSearchResult:
        if request.project_id:
            rows = self.list_by_project(user_id=user_id, project_id=request.project_id, limit=200)
        elif request.ad_lp_pair_id:
            rows = self.list_by_pair(user_id=user_id, pair_id=request.ad_lp_pair_id, limit=200)
        else:
            rows = self.repository.get_many("evidence_sources", user_id=user_id, order="created_at.desc", limit=200)
        terms = [term.lower() for term in request.query.split() if term.strip()]
        scored = []
        for row in rows:
            text = f"{row.get('title') or ''} {row.get('normalized_content') or row.get('raw_content') or ''}".lower()
            score = sum(1 for term in terms if term in text)
            if score or not terms:
                scored.append({**row, "search_score": score})
        return EvidenceSearchResult(
            query=request.query,
            results=sorted(scored, key=lambda item: (item["search_score"], item.get("relevance_score") or 0), reverse=True)[
                : request.limit
            ],
        )
