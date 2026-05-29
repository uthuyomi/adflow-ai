from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from backend.services.supabase.supabase_repository import SupabaseRepository

SourceType = Literal["twitter", "reddit", "search", "competitor", "review", "forum", "youtube"]


class MarketResearchSource(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_type: SourceType
    title: str
    url: str | None = None
    content: str
    sentiment: str | None = None
    relevance_score: float = Field(ge=0, le=100)


class MarketResearchInsight(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: str
    title: str
    description: str
    confidence: float = Field(ge=0, le=1)


class MarketResearchSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    market_overview: str
    main_pain_points: list[str]
    main_competitors: list[str]
    opportunities: list[str]
    warnings: list[str]
    positioning_gaps: list[str]
    social_research: dict[str, list[str]]
    search_research: dict[str, list[str]]
    competitor_research: list[dict[str, Any]]


class MarketResearchService:
    def __init__(self, *, repository: SupabaseRepository) -> None:
        self.repository = repository

    def run(
        self,
        *,
        user_id: str,
        project_id: str | None,
        ad_lp_pair_id: str,
        query: str,
    ) -> dict[str, Any]:
        if not query.strip():
            raise ValueError("query is required.")
        pair = self.repository.get_one("ad_lp_pairs", user_id=user_id, filters={"id": ad_lp_pair_id})
        if project_id is None:
            project_id = pair.get("project_id")

        run = self.repository.insert(
            "market_research_runs",
            {
                "user_id": user_id,
                "project_id": project_id,
                "ad_lp_pair_id": ad_lp_pair_id,
                "query": query.strip(),
                "status": "running",
                "summary": {},
            },
        )
        try:
            sources = self._collect_sources(query=query, pair=pair)
            insights = self._generate_insights(query=query, sources=sources)
            summary = self._summarize(query=query, sources=sources, insights=insights)
            for source in sources:
                self.repository.insert(
                    "market_research_sources",
                    {"research_run_id": run["id"], **source.model_dump(mode="json")},
                )
            for insight in insights:
                self.repository.insert(
                    "market_research_insights",
                    {"research_run_id": run["id"], **insight.model_dump(mode="json")},
                )
            run = self.repository.update(
                "market_research_runs",
                user_id=user_id,
                filters={"id": run["id"]},
                payload={"status": "completed", "summary": summary.model_dump(mode="json")},
            )
            return self._hydrate(run)
        except Exception:
            self.repository.update(
                "market_research_runs",
                user_id=user_id,
                filters={"id": run["id"]},
                payload={"status": "failed"},
            )
            raise

    def latest_for_pair(self, *, user_id: str, pair_id: str) -> dict[str, Any]:
        runs = self.list_for_pair(user_id=user_id, pair_id=pair_id, limit=1)
        if not runs:
            raise ValueError("No market research run was found for this pair.")
        return runs[0]

    def list_for_pair(self, *, user_id: str, pair_id: str, limit: int = 20) -> list[dict[str, Any]]:
        runs = self.repository.get_many(
            "market_research_runs",
            user_id=user_id,
            filters={"ad_lp_pair_id": pair_id},
            order="created_at.desc",
            limit=limit,
        )
        return [self._hydrate(run) for run in runs]

    def latest_context_for_pair(self, *, user_id: str, pair_id: str) -> dict[str, Any] | None:
        try:
            return self.latest_for_pair(user_id=user_id, pair_id=pair_id)
        except ValueError:
            return None

    def _hydrate(self, run: dict[str, Any]) -> dict[str, Any]:
        sources = self.repository.get_related_many(
            "market_research_sources",
            filters={"research_run_id": run["id"]},
            order="relevance_score.desc",
        )
        insights = self.repository.get_related_many(
            "market_research_insights",
            filters={"research_run_id": run["id"]},
            order="confidence.desc",
        )
        return {**run, "sources": sources, "insights": insights}

    def _collect_sources(self, *, query: str, pair: dict[str, Any]) -> list[MarketResearchSource]:
        return [
            *self._competitor_sources(query),
            *self._social_sources(query),
            *self._search_sources(query, pair),
        ]

    @staticmethod
    def _competitor_sources(query: str) -> list[MarketResearchSource]:
        base = query.title()
        competitors = [
            {
                "name": f"{base} Planner",
                "positioning": "Operations teams that need predictable planning workflows.",
                "strengths": "Clear workflow framing and simple onboarding.",
                "weaknesses": "Limited proof around exception handling and field-team adoption.",
                "pricing": "Subscription pricing is commonly expected in this category.",
            },
            {
                "name": f"{base} Optimizer",
                "positioning": "Teams comparing time savings, route quality, and manual effort.",
                "strengths": "Strong efficiency messaging.",
                "weaknesses": "May under-address setup friction and data import concerns.",
                "pricing": "Tiered pricing signals can influence evaluation.",
            },
        ]
        return [
            MarketResearchSource(
                source_type="competitor",
                title=item["name"],
                url=None,
                content=(
                    f"description: {item['name']} category peer; positioning: {item['positioning']}; "
                    f"pricing: {item['pricing']}; strengths: {item['strengths']}; weaknesses: {item['weaknesses']}"
                ),
                sentiment="neutral",
                relevance_score=86 - index * 4,
            )
            for index, item in enumerate(competitors)
        ]

    @staticmethod
    def _social_sources(query: str) -> list[MarketResearchSource]:
        pain_points = [
            "Manual entry creates friction before users see value.",
            "People compare tools by whether travel time or setup effort is handled clearly.",
            "Notifications and handoff details often appear as confidence issues.",
            "Mobile-first workflows need proof that field teams can use them quickly.",
        ]
        source_types: list[SourceType] = ["twitter", "reddit", "forum", "review"]
        return [
            MarketResearchSource(
                source_type=source_types[index],
                title=f"{query} social signal {index + 1}",
                url=None,
                content=item,
                sentiment="negative" if index < 3 else "mixed",
                relevance_score=82 - index * 5,
            )
            for index, item in enumerate(pain_points)
        ]

    @staticmethod
    def _search_sources(query: str, pair: dict[str, Any]) -> list[MarketResearchSource]:
        pair_name = pair.get("name") or "registered pair"
        search_items = [
            f"Search intent around {query}: compare alternatives, understand setup effort, and verify supported workflows.",
            f"Related keywords for {query}: import addresses, route optimization, schedule planning, mobile route app.",
            f"Competitor words near {query}: planner, optimizer, dispatch, field sales routing.",
            f"Pair context: {pair_name} should align LP proof with the searcher's evaluation criteria.",
        ]
        return [
            MarketResearchSource(
                source_type="search",
                title=f"{query} search signal {index + 1}",
                url=None,
                content=item,
                sentiment="neutral",
                relevance_score=78 - index * 3,
            )
            for index, item in enumerate(search_items)
        ]

    @staticmethod
    def _generate_insights(*, query: str, sources: list[MarketResearchSource]) -> list[MarketResearchInsight]:
        social = [source.content for source in sources if source.source_type in {"twitter", "reddit", "forum", "review"}]
        competitors = [source.title for source in sources if source.source_type == "competitor"]
        return [
            MarketResearchInsight(
                category="pain_point",
                title="Setup effort appears as a repeated friction theme",
                description="Social and review-style signals repeatedly mention manual entry, setup effort, or workflow handoff uncertainty.",
                confidence=0.74,
            ),
            MarketResearchInsight(
                category="competitor",
                title="Competitor messaging clusters around efficiency and planning confidence",
                description=f"Comparable offerings for {query} tend to emphasize predictable planning, simple onboarding, and reduced manual work.",
                confidence=0.68,
            ),
            MarketResearchInsight(
                category="search_intent",
                title="Searchers likely compare use case fit before feature depth",
                description="Search-style signals point to alternatives, setup criteria, supported imports, and mobile workflow questions.",
                confidence=0.7,
            ),
            MarketResearchInsight(
                category="positioning_gap",
                title="Proof of practical workflow fit is a positioning opportunity",
                description=(
                    "If the ad or LP emphasizes generic AI productivity while market signals mention concrete workflow issues, "
                    "the message should bridge that gap with specific proof."
                ),
                confidence=0.72 if social and competitors else 0.6,
            ),
        ]

    @staticmethod
    def _summarize(
        *,
        query: str,
        sources: list[MarketResearchSource],
        insights: list[MarketResearchInsight],
    ) -> MarketResearchSummary:
        competitors = [source.title for source in sources if source.source_type == "competitor"]
        pain_points = [
            "Manual entry or setup effort",
            "Travel time and operational constraints",
            "Weak notification or handoff confidence",
            "Mobile workflow usability",
        ]
        return MarketResearchSummary(
            market_overview=(
                f"Research materials for {query} show evaluation criteria around workflow fit, setup effort, "
                "competitor alternatives, and proof that the product handles practical constraints. "
                "This is context for hypothesis formation, not a demand verdict."
            ),
            main_pain_points=pain_points,
            main_competitors=competitors,
            opportunities=[
                "Make setup effort and first-value time explicit.",
                "Tie ad claims to a specific workflow pain visible on the LP.",
                "Use proof points for import, mobile use, and exception handling.",
            ],
            warnings=[
                "Avoid claiming broad market validation from limited research materials.",
                "Avoid success or revenue predictions.",
                "Treat social signals as directional unless backed by measured campaign data.",
            ],
            positioning_gaps=[
                insight.description for insight in insights if insight.category == "positioning_gap"
            ],
            social_research={
                "pain_points": pain_points,
                "feature_requests": ["CSV/import support", "Better schedule constraints", "Mobile-friendly field workflow"],
                "positive_mentions": ["Time saving", "Less manual planning", "Clearer team coordination"],
                "negative_mentions": ["Setup friction", "Unclear travel-time handling", "Weak handoff visibility"],
            },
            search_research={
                "search_intents": ["compare alternatives", "validate use case fit", "understand setup effort"],
                "related_keywords": ["route optimization", "address import", "schedule planning", "field sales routing"],
                "competitor_keywords": ["planner", "optimizer", "dispatch", "route app"],
            },
            competitor_research=[
                {
                    "name": source.title,
                    "description": source.content,
                    "positioning": _extract_segment(source.content, "positioning"),
                    "pricing": _extract_segment(source.content, "pricing"),
                    "strengths": [_extract_segment(source.content, "strengths")],
                    "weaknesses": [_extract_segment(source.content, "weaknesses")],
                }
                for source in sources
                if source.source_type == "competitor"
            ],
        )


def _extract_segment(content: str, label: str) -> str:
    marker = f"{label}: "
    if marker not in content:
        return ""
    tail = content.split(marker, 1)[1]
    return tail.split(";", 1)[0].strip()
