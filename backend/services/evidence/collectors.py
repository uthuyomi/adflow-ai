from __future__ import annotations

from typing import Protocol

from backend.services.evidence.models import EvidenceCollectionRequest, EvidenceSourceCreate


class BaseEvidenceCollector(Protocol):
    def collect(self, request: EvidenceCollectionRequest) -> list[EvidenceSourceCreate]:
        ...


class SearchProvider(Protocol):
    def search(self, query: str, max_items: int, language: str, region: str) -> list[EvidenceSourceCreate]:
        ...


class ManualEvidenceCollector:
    def collect(self, request: EvidenceCollectionRequest) -> list[EvidenceSourceCreate]:
        items: list[EvidenceSourceCreate] = []
        for index, item in enumerate(request.manual_items):
            content = str(item.get("content") or item.get("raw_content") or "").strip()
            if not content:
                continue
            items.append(
                EvidenceSourceCreate(
                    project_id=request.project_id,
                    ad_lp_pair_id=request.ad_lp_pair_id,
                    market_research_run_id=request.market_research_run_id,
                    product_review_run_id=request.product_review_run_id,
                    monitoring_run_id=request.monitoring_run_id,
                    idea_session_id=request.idea_session_id,
                    source_type=str(item.get("source_type") or "manual"),
                    source_platform=str(item.get("source_platform") or "manual"),
                    title=str(item.get("title") or f"Manual evidence {index + 1}"),
                    query=request.query,
                    language=request.language,
                    region=request.region,
                    raw_content=content,
                    metadata={"collector": "manual", **dict(item.get("metadata") or {})},
                ),
            )
        return items[: request.max_items]


class MockEvidenceCollector:
    templates = (
        ("review", "Setup friction", "Users mention that initial setup and repeated input feel heavier than expected."),
        ("reddit", "Workflow fit", "Teams ask whether the product handles real operational constraints without manual cleanup."),
        ("twitter", "CTA mismatch", "Short-form posts react better when the promise matches the first screen exactly."),
        ("competitor", "Competitor promise", "A category peer emphasizes onboarding speed and concrete workflow proof."),
        ("search", "Search intent", "Searchers compare alternatives, setup effort, integrations, pricing, and mobile fit."),
        ("forum", "Feature request", "People want import support, templates, and fewer manual steps before first value."),
        ("review", "Pricing concern", "Some reviewers treat unclear pricing and plan limits as evaluation friction."),
        ("youtube", "Demo comment", "Demo viewers ask for proof that edge cases work in day-to-day usage."),
    )

    def collect(self, request: EvidenceCollectionRequest) -> list[EvidenceSourceCreate]:
        count = min(max(20, min(request.max_items, 40)), request.max_items)
        items: list[EvidenceSourceCreate] = []
        for index in range(count):
            source_type, title, body = self.templates[index % len(self.templates)]
            items.append(
                EvidenceSourceCreate(
                    project_id=request.project_id,
                    ad_lp_pair_id=request.ad_lp_pair_id,
                    market_research_run_id=request.market_research_run_id,
                    product_review_run_id=request.product_review_run_id,
                    monitoring_run_id=request.monitoring_run_id,
                    idea_session_id=request.idea_session_id,
                    source_type=source_type,
                    source_platform=f"{source_type}_mock",
                    title=f"{title}: {request.query} #{index + 1}",
                    query=request.query,
                    language=request.language,
                    region=request.region,
                    raw_content=f"{body} Query context: {request.query}. Evidence sample {index + 1}.",
                    metadata={"collector": "mock", "sample_index": index},
                ),
            )
        return items


class StubCollector:
    def __init__(self, *, source_type: str, platform: str) -> None:
        self.source_type = source_type
        self.platform = platform

    def collect(self, request: EvidenceCollectionRequest) -> list[EvidenceSourceCreate]:
        count = min(5, request.max_items)
        return [
            EvidenceSourceCreate(
                project_id=request.project_id,
                ad_lp_pair_id=request.ad_lp_pair_id,
                market_research_run_id=request.market_research_run_id,
                product_review_run_id=request.product_review_run_id,
                monitoring_run_id=request.monitoring_run_id,
                idea_session_id=request.idea_session_id,
                source_type=self.source_type,
                source_platform=self.platform,
                title=f"{self.platform} stub signal {index + 1}",
                query=request.query,
                language=request.language,
                region=request.region,
                raw_content=(
                    f"Stub evidence for {request.query}. Replace {self.platform} with a real provider later."
                ),
                metadata={"collector": self.platform, "stub": True},
            )
            for index in range(count)
        ]


def collector_for(source: str) -> BaseEvidenceCollector:
    normalized = source.strip().lower()
    if normalized == "manual":
        return ManualEvidenceCollector()
    if normalized == "mock":
        return MockEvidenceCollector()
    mapping = {
        "web_stub": ("search", "web_stub"),
        "search_stub": ("search", "search_stub"),
        "reddit_stub": ("reddit", "reddit_stub"),
        "twitter_stub": ("twitter", "twitter_stub"),
        "review_stub": ("review", "review_stub"),
        "competitor_stub": ("competitor", "competitor_stub"),
        "youtube_stub": ("youtube", "youtube_stub"),
        "github_stub": ("forum", "github_stub"),
    }
    source_type, platform = mapping.get(normalized, ("mock", normalized or "unknown_stub"))
    return StubCollector(source_type=source_type, platform=platform)
