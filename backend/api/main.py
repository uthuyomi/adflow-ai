from __future__ import annotations

from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.core.config import Settings, load_settings
from backend.services.ads.ad_collector_service import (
    AdCollectorService,
    FullAdsCollection,
)
from backend.services.ai.ad_improvement_service import AdImprovementService
from backend.services.ai.deterministic_llm_client import DeterministicLLMClient
from backend.services.ai.diff_service import DiffService
from backend.services.ai.feature_extractor import FeatureExtractor
from backend.services.ai.lp_improvement_service import LPImprovementService
from backend.services.ai.openai_json_client import OpenAIJSONClient
from backend.services.ai.provider_registry import AIProviderRegistry
from backend.services.ai.review_service import ReviewService
from backend.services.analysis.registered_pair_analysis_service import (
    RegisteredPairAnalysisService,
)
from backend.services.analytics.adflow_workflow_service import (
    AdFlowWorkflowInput,
    AdFlowWorkflowResult,
    AdFlowWorkflowService,
)
from backend.services.analytics.storage_service import (
    InMemoryCollectionStorage,
    SupabaseCollectionStorage,
)
from backend.services.github.github_pr_client import GitHubPRClient
from backend.services.github.in_memory_pr_client import InMemoryPullRequestClient
from backend.services.github.pr_service import PRService
from backend.services.history.change_history_service import ChangeHistoryService
from backend.services.lp.lp_collector import LPCollection, LPCollector
from backend.services.orchestration.ai_orchestrator import AIOrchestrator
from backend.services.supabase.supabase_repository import SupabaseRepository

app = FastAPI(title="AdFlow AI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AdFlowRunRequest(BaseModel):
    workflow: AdFlowWorkflowInput = Field(
        default_factory=lambda: AdFlowWorkflowInput(
            pr_title="Improve ad and landing page copy",
            base_branch="main",
            head_branch="adflow/local-preview",
            allowed_paths=["app/page.tsx"],
            predicted_ctr=6.1,
            predicted_cvr=2.8,
        ),
    )
    ads: FullAdsCollection | None = None
    lp: LPCollection | None = None


class DecisionRequest(BaseModel):
    decision_status: str
    decision_reason: str | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/workflow/run", response_model=AdFlowWorkflowResult)
def run_workflow(request: AdFlowRunRequest | None = None) -> AdFlowWorkflowResult:
    request = request or AdFlowRunRequest()
    try:
        workflow = _build_workflow(request.ads, request.lp, load_settings())
        return workflow.run(request.workflow)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _authenticated_user_id(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token is required.")
    settings = load_settings()
    if settings.supabase_url is None or settings.supabase_key is None:
        raise HTTPException(status_code=500, detail="Supabase settings are required.")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return SupabaseRepository(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_key,
        ).get_user_id(token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@app.post("/analysis/pairs/{pair_id}/run")
def run_pair_analysis(
    pair_id: str,
    user_id: str = Depends(_authenticated_user_id),
) -> dict[str, Any]:
    try:
        return _build_registered_pair_analysis(load_settings()).run(
            user_id=user_id,
            pair_id=pair_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/analysis/pairs/{pair_id}/runs")
def list_pair_analysis_runs(
    pair_id: str,
    user_id: str = Depends(_authenticated_user_id),
) -> list[dict[str, Any]]:
    try:
        return _build_registered_pair_analysis(load_settings()).list_runs(
            user_id=user_id,
            pair_id=pair_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/analysis/pairs/{pair_id}/latest")
def latest_pair_analysis_run(
    pair_id: str,
    user_id: str = Depends(_authenticated_user_id),
) -> dict[str, Any]:
    try:
        return _build_registered_pair_analysis(load_settings()).latest_run(
            user_id=user_id,
            pair_id=pair_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/orchestration/agents")
def list_ai_agents(user_id: str = Depends(_authenticated_user_id)) -> list[dict[str, Any]]:
    try:
        service = _build_orchestrator(load_settings())
        service.ensure_default_agents(user_id=user_id)
        return service.repository.get_many("ai_agents", user_id=user_id, order="provider.asc")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/orchestration/runs")
def list_orchestration_runs(user_id: str = Depends(_authenticated_user_id)) -> list[dict[str, Any]]:
    try:
        return _build_orchestrator(load_settings()).list_runs(user_id=user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/orchestration/runs/{run_id}/results")
def list_orchestration_run_results(
    run_id: str,
    user_id: str = Depends(_authenticated_user_id),
) -> list[dict[str, Any]]:
    try:
        return _build_orchestrator(load_settings()).list_agent_results_for_run(
            user_id=user_id,
            orchestration_run_id=run_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/orchestration/scorecards")
def list_ai_agent_scorecards(
    user_id: str = Depends(_authenticated_user_id),
) -> list[dict[str, Any]]:
    try:
        return _build_orchestrator(load_settings()).list_scorecards(user_id=user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/orchestration/results/{result_id}/decision")
def decide_ai_agent_result(
    result_id: str,
    request: DecisionRequest,
    user_id: str = Depends(_authenticated_user_id),
) -> dict[str, Any]:
    try:
        return _build_orchestrator(load_settings()).set_result_decision(
            user_id=user_id,
            result_id=result_id,
            decision_status=request.decision_status,
            decision_reason=request.decision_reason,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/orchestration/results/{result_id}/codex-task")
def generate_codex_task(
    result_id: str,
    user_id: str = Depends(_authenticated_user_id),
) -> dict[str, Any]:
    try:
        return _build_orchestrator(load_settings()).build_codex_task_prompt(
            user_id=user_id,
            result_id=result_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _build_workflow(
    ads: FullAdsCollection | None,
    lp: LPCollection | None,
    settings: Settings,
) -> AdFlowWorkflowService:
    settings.validate_runtime()
    llm_client = _build_llm_client(settings)
    pr_client = _build_pr_client(settings)
    storage = _build_storage(settings)
    return AdFlowWorkflowService(
        ad_collector=AdCollectorService(StaticAdsDataSource(ads)),
        lp_collector=LPCollector(StaticLPDataSource(lp)),
        feature_extractor=FeatureExtractor(),
        ad_improvement_service=AdImprovementService(llm_client),
        lp_improvement_service=LPImprovementService(llm_client),
        diff_service=DiffService(llm_client),
        review_service=ReviewService(llm_client),
        storage=storage,
        pr_service=PRService(pr_client),
    )


def _build_registered_pair_analysis(settings: Settings) -> RegisteredPairAnalysisService:
    if settings.supabase_url is None or settings.supabase_key is None:
        raise ValueError("SUPABASE_URL and Supabase key are required.")
    repository = SupabaseRepository(
        supabase_url=settings.supabase_url,
        supabase_key=settings.supabase_key,
    )
    return RegisteredPairAnalysisService(
        repository=repository,
        change_history_service=ChangeHistoryService(repository),
        feature_extractor=FeatureExtractor(),
        llm_client=_build_llm_client(settings),
        orchestrator=AIOrchestrator(
            repository=repository,
            provider_registry=AIProviderRegistry(settings),
        ),
    )


def _build_orchestrator(settings: Settings) -> AIOrchestrator:
    if settings.supabase_url is None or settings.supabase_key is None:
        raise ValueError("SUPABASE_URL and Supabase key are required.")
    return AIOrchestrator(
        repository=SupabaseRepository(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_key,
        ),
        provider_registry=AIProviderRegistry(settings),
    )


def _build_llm_client(settings: Settings) -> DeterministicLLMClient | OpenAIJSONClient:
    if settings.ai_provider == "openai":
        if settings.openai_model is None:
            raise ValueError("OPENAI_MODEL is required.")
        return OpenAIJSONClient(model=settings.openai_model)

    return DeterministicLLMClient()


def _build_pr_client(settings: Settings) -> InMemoryPullRequestClient | GitHubPRClient:
    if settings.github_provider == "github":
        if settings.github_repository is None or settings.github_token is None:
            raise ValueError("GITHUB_REPOSITORY and GITHUB_TOKEN are required.")
        return GitHubPRClient(
            repository=settings.github_repository,
            token=settings.github_token,
        )

    return InMemoryPullRequestClient()


def _build_storage(
    settings: Settings,
) -> InMemoryCollectionStorage | SupabaseCollectionStorage:
    if settings.storage_provider == "supabase":
        if settings.supabase_url is None or settings.supabase_key is None:
            raise ValueError("SUPABASE_URL and Supabase key are required.")
        return SupabaseCollectionStorage(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_key,
            table=settings.supabase_table,
        )

    return InMemoryCollectionStorage()


class StaticAdsDataSource:
    def __init__(self, ads: FullAdsCollection | None = None) -> None:
        self.ads = ads or FullAdsCollection.model_validate(_sample_ads_payload())

    def fetch_campaigns(self) -> list[dict[str, Any]]:
        return _dump_list(self.ads.campaigns)

    def fetch_ad_groups(self) -> list[dict[str, Any]]:
        return _dump_list(self.ads.ad_groups)

    def fetch_ads(self) -> list[dict[str, Any]]:
        return _dump_list(self.ads.ads)

    def fetch_performance(self) -> list[dict[str, Any]]:
        return _dump_list(self.ads.performance)

    def fetch_time_snapshots(self) -> list[dict[str, Any]]:
        return _dump_list(self.ads.time)


class StaticLPDataSource:
    def __init__(self, lp: LPCollection | None = None) -> None:
        self.lp = lp or LPCollection.model_validate(_sample_lp_payload())

    def fetch_structure(self) -> dict[str, Any]:
        return self.lp.structure.model_dump(mode="json", by_alias=True)

    def fetch_behavior(self) -> dict[str, Any]:
        return self.lp.behavior.model_dump(mode="json")

    def fetch_performance(self) -> dict[str, Any]:
        return self.lp.performance.model_dump(mode="json", by_alias=True)


def _dump_list(items: list[BaseModel]) -> list[dict[str, Any]]:
    return [item.model_dump(mode="json") for item in items]


def _sample_ads_payload() -> dict[str, Any]:
    return {
        "campaigns": [
            {
                "campaign_id": "cmp_001",
                "campaign_name": "Route Automation Launch",
                "budget": 120000,
                "start_date": "2026-05-01",
                "end_date": None,
                "status": "active",
            },
        ],
        "ad_groups": [
            {
                "targeting": {"keyword": "route planning"},
                "interests": ["field sales", "delivery", "operations"],
                "age_range": "25-54",
                "gender": "all",
                "location": "JP",
                "device": "mobile",
            },
        ],
        "ads": [
            {
                "headline": "Create routes easily",
                "body": "Turn address lists into Google Maps routes.",
                "cta": "Try for free",
                "image": None,
                "video": None,
            },
        ],
        "performance": [
            {
                "campaign_id": "cmp_001",
                "impressions": 20000,
                "clicks": 1480,
                "ctr": 7.4,
                "cpc": 96.0,
                "cvr": 3.1,
                "spend": 142080.0,
                "conversions": 45,
                "reach": 18000,
                "frequency": 1.11,
            },
            {
                "campaign_id": "cmp_001",
                "impressions": 22000,
                "clicks": 1034,
                "ctr": 4.7,
                "cpc": 132.0,
                "cvr": 2.2,
                "spend": 136488.0,
                "conversions": 23,
                "reach": 19000,
                "frequency": 1.16,
            },
        ],
        "time": [
            {
                "timestamp": "2026-05-27T10:00:00+09:00",
                "hour": 10,
                "weekday": "Friday",
            },
        ],
    }


def _sample_lp_payload() -> dict[str, Any]:
    return {
        "structure": {
            "hero_title": "Create routes easily",
            "hero_subtitle": "Prepare address lists for Google Maps.",
            "CTA_count": 2,
            "buttons": ["Try for free", "Request materials"],
            "FAQ": ["Can I use CSV files?", "Can I use it on mobile?"],
        },
        "behavior": {
            "bounce_rate": 74,
            "session_duration": 42,
            "scroll_depth": 58,
        },
        "performance": {
            "page_speed": 82,
            "FCP": 1.2,
            "LCP": 2.4,
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.api.main:app", host="127.0.0.1", port=8000)
