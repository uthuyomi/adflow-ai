from __future__ import annotations

import os
from typing import Any, Literal

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
from backend.services.billing.credits import CREDIT_COSTS, CreditService, InsufficientCreditsError
from backend.services.github.github_pr_client import GitHubPRClient
from backend.services.github.in_memory_pr_client import InMemoryPullRequestClient
from backend.services.github.pr_service import PRService
from backend.services.history.change_history_service import ChangeHistoryService
from backend.services.lp.lp_collector import LPCollection, LPCollector
from backend.services.demand.demand_intelligence_service import DemandIntelligenceService
from backend.services.orchestration.ai_orchestrator import AIOrchestrator
from backend.services.outcomes.improvement_outcome_service import ImprovementOutcomeService
from backend.services.supabase.supabase_repository import SupabaseRepository

app = FastAPI(title="AdFlow AI")
_AUTHENTICATED_USER_EMAILS: dict[str, str] = {}


def _cors_origins() -> list[str]:
    default_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3020",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3020",
    ]
    configured = [
        origin.strip().rstrip("/")
        for origin in os.getenv("ADFLOW_CORS_ORIGINS", "").split(",")
        if origin.strip()
    ]
    return [*default_origins, *configured]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
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


class PairAnalysisRequest(BaseModel):
    ai_mode: Literal["multi_provider", "openai_only"] = "openai_only"
    locale: Literal["ja", "en"] = "ja"


class DemandIntelligenceRunRequest(BaseModel):
    project_id: str | None = None
    ad_lp_pair_id: str
    query: str
    locale: Literal["ja", "en"] = "ja"


class DemandSolutionFitRequest(BaseModel):
    fit_target_type: Literal["app_idea", "ad_copy", "lp_hero", "lp_offer", "feature", "positioning", "pair"]
    fit_target_text: str


class OutcomeCreateRequest(BaseModel):
    project_id: str | None = None
    ad_lp_pair_id: str
    source_ai_result_id: str | None = None
    source_codex_task_id: str | None = None
    title: str
    description: str | None = None
    before_metrics: dict[str, Any] = Field(default_factory=dict)
    after_metrics: dict[str, Any] = Field(default_factory=dict)


class OutcomeUpdateRequest(BaseModel):
    implemented_at: str | None = None
    measured_at: str | None = None
    before_metrics: dict[str, Any] | None = None
    after_metrics: dict[str, Any] | None = None
    outcome_status: str | None = None
    outcome_summary: str | None = None
    learning_notes: str | None = None
    title: str | None = None
    description: str | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _authenticated_user_id(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token is required.")
    settings = load_settings()
    if settings.supabase_url is None or settings.supabase_key is None:
        raise HTTPException(status_code=500, detail="Supabase settings are required.")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        user = SupabaseRepository(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_key,
        ).get_user(token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    user_id = str(user["id"])
    email = user.get("email")
    if isinstance(email, str) and email:
        _AUTHENTICATED_USER_EMAILS[user_id] = email.lower()
    return user_id


@app.post("/workflow/run", response_model=AdFlowWorkflowResult)
def run_workflow(
    request: AdFlowRunRequest | None = None,
    user_id: str = Depends(_authenticated_user_id),
) -> AdFlowWorkflowResult:
    request = request or AdFlowRunRequest()
    try:
        _require_feature_credits(user_id=user_id, feature_key="workflow_run")
        workflow = _build_workflow(request.ads, request.lp, load_settings())
        result = workflow.run(request.workflow)
        _consume_feature_credits(user_id=user_id, feature_key="workflow_run", metadata={"endpoint": "/workflow/run"})
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/analysis/pairs/{pair_id}/run")
def run_pair_analysis(
    pair_id: str,
    request: PairAnalysisRequest | None = None,
    user_id: str = Depends(_authenticated_user_id),
) -> dict[str, Any]:
    request = request or PairAnalysisRequest()
    try:
        _require_feature_credits(user_id=user_id, feature_key="pair_analysis")
        result = _build_registered_pair_analysis(load_settings()).run(
            user_id=user_id,
            pair_id=pair_id,
            ai_mode=request.ai_mode,
            locale=request.locale,
        )
        _consume_feature_credits(
            user_id=user_id,
            feature_key="pair_analysis",
            metadata={"endpoint": "/analysis/pairs/{pair_id}/run", "pair_id": pair_id},
        )
        return result
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


@app.post("/demand-intelligence/run")
def run_demand_intelligence(
    request: DemandIntelligenceRunRequest,
    user_id: str = Depends(_authenticated_user_id),
) -> dict[str, Any]:
    try:
        _require_feature_credits(user_id=user_id, feature_key="demand_intelligence")
        run = _build_demand_intelligence_service(load_settings()).run(
            user_id=user_id,
            project_id=request.project_id,
            ad_lp_pair_id=request.ad_lp_pair_id,
            query=request.query,
            locale=request.locale,
        )
        _consume_feature_credits(
            user_id=user_id,
            feature_key="demand_intelligence",
            metadata={"endpoint": "/demand-intelligence/run", "run_id": run["id"]},
        )
        return {"run_id": run["id"], "status": run["status"], "run": run}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/demand-intelligence/pairs/{pair_id}/latest")
def latest_demand_intelligence(
    pair_id: str,
    user_id: str = Depends(_authenticated_user_id),
) -> dict[str, Any]:
    try:
        return _build_demand_intelligence_service(load_settings()).latest_for_pair(
            user_id=user_id,
            pair_id=pair_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/demand-intelligence/pairs/{pair_id}/runs")
def list_demand_intelligence_runs(
    pair_id: str,
    user_id: str = Depends(_authenticated_user_id),
) -> list[dict[str, Any]]:
    try:
        return _build_demand_intelligence_service(load_settings()).list_for_pair(
            user_id=user_id,
            pair_id=pair_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/demand-intelligence/runs/{run_id}")
def get_demand_intelligence_run(
    run_id: str,
    user_id: str = Depends(_authenticated_user_id),
) -> dict[str, Any]:
    try:
        return _build_demand_intelligence_service(load_settings()).get_run(user_id=user_id, run_id=run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/demand-intelligence/runs/{run_id}/signals")
def get_demand_signals(run_id: str, user_id: str = Depends(_authenticated_user_id)) -> list[dict[str, Any]]:
    _build_demand_intelligence_service(load_settings()).get_run(user_id=user_id, run_id=run_id)
    return _repository_for_settings(load_settings()).get_related_many("demand_intelligence_signals", filters={"run_id": run_id}, order="created_at.asc")


@app.get("/demand-intelligence/runs/{run_id}/clusters")
def get_demand_clusters(run_id: str, user_id: str = Depends(_authenticated_user_id)) -> list[dict[str, Any]]:
    _build_demand_intelligence_service(load_settings()).get_run(user_id=user_id, run_id=run_id)
    return _repository_for_settings(load_settings()).get_related_many("demand_intelligence_clusters", filters={"run_id": run_id}, order="demand_signal_score.desc")


@app.get("/demand-intelligence/runs/{run_id}/validations")
def get_demand_validations(run_id: str, user_id: str = Depends(_authenticated_user_id)) -> list[dict[str, Any]]:
    return _repository_for_settings(load_settings()).get_demand_validations_for_run(user_id=user_id, run_id=run_id)


@app.get("/demand-intelligence/runs/{run_id}/solution-fits")
def get_demand_solution_fits(run_id: str, user_id: str = Depends(_authenticated_user_id)) -> list[dict[str, Any]]:
    return _repository_for_settings(load_settings()).get_demand_solution_fits_for_run(user_id=user_id, run_id=run_id)


@app.get("/demand-intelligence/runs/{run_id}/snapshots")
def get_demand_snapshots(run_id: str, user_id: str = Depends(_authenticated_user_id)) -> list[dict[str, Any]]:
    run = _build_demand_intelligence_service(load_settings()).get_run(user_id=user_id, run_id=run_id)
    return _repository_for_settings(load_settings()).get_many("demand_signal_snapshots", user_id=user_id, filters={"run_id": run["id"]}, order="created_at.desc")


@app.get("/demand-intelligence/runs/{run_id}/source-runs")
def get_demand_source_runs(run_id: str, user_id: str = Depends(_authenticated_user_id)) -> list[dict[str, Any]]:
    return _repository_for_settings(load_settings()).get_demand_source_runs_for_run(user_id=user_id, run_id=run_id)


@app.get("/demand-intelligence/runs/{run_id}/search-demand")
def get_demand_search_demand(run_id: str, user_id: str = Depends(_authenticated_user_id)) -> list[dict[str, Any]]:
    _build_demand_intelligence_service(load_settings()).get_run(user_id=user_id, run_id=run_id)
    return _repository_for_settings(load_settings()).get_demand_search_signals_for_run(user_id=user_id, run_id=run_id)


@app.get("/demand-intelligence/runs/{run_id}/market-size")
def get_demand_market_size(run_id: str, user_id: str = Depends(_authenticated_user_id)) -> list[dict[str, Any]]:
    _build_demand_intelligence_service(load_settings()).get_run(user_id=user_id, run_id=run_id)
    return _repository_for_settings(load_settings()).get_demand_market_size_for_run(user_id=user_id, run_id=run_id)


@app.get("/demand-intelligence/runs/{run_id}/outcome-learning")
def get_demand_outcome_learning(run_id: str, user_id: str = Depends(_authenticated_user_id)) -> list[dict[str, Any]]:
    _build_demand_intelligence_service(load_settings()).get_run(user_id=user_id, run_id=run_id)
    return _repository_for_settings(load_settings()).get_demand_outcome_learning_for_run(user_id=user_id, run_id=run_id)


@app.post("/demand-intelligence/runs/{run_id}/outcome-learning/rebuild")
def rebuild_demand_outcome_learning(run_id: str, user_id: str = Depends(_authenticated_user_id)) -> dict[str, Any]:
    try:
        _require_feature_credits(user_id=user_id, feature_key="outcome_learning_rebuild")
        result = _build_demand_intelligence_service(load_settings()).rebuild_outcome_learning(user_id=user_id, run_id=run_id)
        _consume_feature_credits(
            user_id=user_id,
            feature_key="outcome_learning_rebuild",
            metadata={"endpoint": "/demand-intelligence/runs/{run_id}/outcome-learning/rebuild", "run_id": run_id},
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/demand-intelligence/runs/{run_id}/evidence")
def get_demand_evidence(run_id: str, user_id: str = Depends(_authenticated_user_id)) -> list[dict[str, Any]]:
    _build_demand_intelligence_service(load_settings()).get_run(user_id=user_id, run_id=run_id)
    return _repository_for_settings(load_settings()).get_demand_evidence_for_run(run_id=run_id)


@app.post("/demand-intelligence/runs/{run_id}/solution-fit")
def run_demand_solution_fit(
    run_id: str,
    request: DemandSolutionFitRequest,
    user_id: str = Depends(_authenticated_user_id),
) -> dict[str, Any]:
    try:
        _require_feature_credits(user_id=user_id, feature_key="demand_solution_fit")
        result = _build_demand_intelligence_service(load_settings()).create_solution_fit(
            user_id=user_id,
            run_id=run_id,
            fit_target_type=request.fit_target_type,
            fit_target_text=request.fit_target_text,
        )
        _consume_feature_credits(
            user_id=user_id,
            feature_key="demand_solution_fit",
            metadata={"endpoint": "/demand-intelligence/runs/{run_id}/solution-fit", "run_id": run_id},
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/demand-intelligence/pairs/{pair_id}/monitoring")
def get_pair_demand_monitoring(pair_id: str, user_id: str = Depends(_authenticated_user_id)) -> dict[str, Any]:
    snapshots = _repository_for_settings(load_settings()).get_demand_snapshots_for_cluster(user_id=user_id, pair_id=pair_id, limit=200)
    return {
        "snapshots": snapshots,
        "emerging_clusters": [item for item in snapshots if item.get("trend_status") == "emerging"],
        "growing_clusters": [item for item in snapshots if item.get("trend_status") == "growing"],
        "declining_clusters": [item for item in snapshots if item.get("trend_status") == "declining"],
    }


@app.post("/outcomes")
def create_outcome(
    request: OutcomeCreateRequest,
    user_id: str = Depends(_authenticated_user_id),
) -> dict[str, Any]:
    try:
        return _build_outcome_service(load_settings()).create_outcome(
            user_id=user_id,
            project_id=request.project_id,
            ad_lp_pair_id=request.ad_lp_pair_id,
            source_ai_result_id=request.source_ai_result_id,
            source_codex_task_id=request.source_codex_task_id,
            title=request.title,
            description=request.description,
            before_metrics=request.before_metrics,
            after_metrics=request.after_metrics,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/outcomes/pairs/{pair_id}")
def list_outcomes_for_pair(
    pair_id: str,
    user_id: str = Depends(_authenticated_user_id),
) -> list[dict[str, Any]]:
    try:
        return _build_outcome_service(load_settings()).get_outcomes_for_pair(user_id=user_id, pair_id=pair_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/outcomes/pairs/{pair_id}/latest")
def latest_outcome_for_pair(
    pair_id: str,
    user_id: str = Depends(_authenticated_user_id),
) -> dict[str, Any]:
    try:
        return _build_outcome_service(load_settings()).get_latest_outcome_for_pair(user_id=user_id, pair_id=pair_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.patch("/outcomes/{outcome_id}")
def update_outcome(
    outcome_id: str,
    request: OutcomeUpdateRequest,
    user_id: str = Depends(_authenticated_user_id),
) -> dict[str, Any]:
    try:
        return _build_outcome_service(load_settings()).update_outcome(
            user_id=user_id,
            outcome_id=outcome_id,
            payload=request.model_dump(exclude_unset=True),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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
        _require_feature_credits(user_id=user_id, feature_key="codex_task")
        result = _build_orchestrator(load_settings()).build_codex_task_prompt(
            user_id=user_id,
            result_id=result_id,
        )
        _consume_feature_credits(
            user_id=user_id,
            feature_key="codex_task",
            metadata={"endpoint": "/orchestration/results/{result_id}/codex-task", "result_id": result_id},
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/billing/me")
def get_billing_profile(user_id: str = Depends(_authenticated_user_id)) -> dict[str, Any]:
    try:
        rows = _repository_for_settings(load_settings()).get_many(
            "user_billing_profiles",
            user_id=user_id,
            limit=1,
        )
        if not rows:
            return {
                "plan": "free",
                "subscriptionStatus": "inactive",
                "currentPeriodEnd": None,
            }
        profile = rows[0]
        return {
            "plan": profile.get("plan", "free"),
            "subscriptionStatus": profile.get("subscription_status", "inactive"),
            "currentPeriodEnd": profile.get("current_period_end"),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/credits/me")
def get_credit_balance(user_id: str = Depends(_authenticated_user_id)) -> dict[str, Any]:
    try:
        balance = CreditService(_repository_for_settings(load_settings())).get_balance(user_id)
        return {
            "monthlyCredits": balance["monthly_credits"],
            "purchasedCredits": balance["purchased_credits"],
            "totalCredits": balance["total_credits"],
            "lifetimeUsedCredits": balance["lifetime_used_credits"],
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/orchestration/results/{result_id}/outcome")
def generate_outcome_from_ai_result(
    result_id: str,
    user_id: str = Depends(_authenticated_user_id),
) -> dict[str, Any]:
    try:
        return _build_outcome_service(load_settings()).create_from_ai_result(user_id=user_id, result_id=result_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/orchestration/codex-tasks/{task_id}/outcome")
def generate_outcome_from_codex_task(
    task_id: str,
    user_id: str = Depends(_authenticated_user_id),
) -> dict[str, Any]:
    try:
        return _build_outcome_service(load_settings()).create_from_codex_task(user_id=user_id, task_id=task_id)
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
        openai_llm_client=_build_openai_llm_client(settings),
        demand_intelligence_service=DemandIntelligenceService(repository=repository, settings=settings),
        outcome_service=ImprovementOutcomeService(repository=repository),
        orchestrator=AIOrchestrator(
            repository=repository,
            provider_registry=AIProviderRegistry(settings),
        ),
    )


def _build_demand_intelligence_service(settings: Settings) -> DemandIntelligenceService:
    if settings.supabase_url is None or settings.supabase_key is None:
        raise ValueError("SUPABASE_URL and Supabase key are required.")
    return DemandIntelligenceService(repository=_repository_for_settings(settings), settings=settings)


def _repository_for_settings(settings: Settings) -> SupabaseRepository:
    if settings.supabase_url is None or settings.supabase_key is None:
        raise ValueError("SUPABASE_URL and Supabase key are required.")
    return SupabaseRepository(
        supabase_url=settings.supabase_url,
        supabase_key=settings.supabase_key,
    )


def _consume_feature_credits(user_id: str, feature_key: str, metadata: dict[str, Any]) -> None:
    cost = CREDIT_COSTS[feature_key]
    settings = load_settings()
    service = CreditService(_repository_for_settings(settings))
    try:
        _ensure_auto_top_up_credits(service=service, settings=settings, user_id=user_id, amount=cost.amount)
        service.consume(
            user_id=user_id,
            amount=cost.amount,
            reason=cost.reason,
            metadata=metadata,
        )
    except InsufficientCreditsError as exc:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "INSUFFICIENT_CREDITS",
                "message": "Credits are insufficient.",
                "requiredCredits": exc.required_credits,
                "currentCredits": exc.current_credits,
            },
        ) from exc


def _require_feature_credits(user_id: str, feature_key: str) -> None:
    cost = CREDIT_COSTS[feature_key]
    settings = load_settings()
    service = CreditService(_repository_for_settings(settings))
    try:
        balance = _ensure_auto_top_up_credits(service=service, settings=settings, user_id=user_id, amount=cost.amount)
    except InsufficientCreditsError as exc:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "INSUFFICIENT_CREDITS",
                "message": "Credits are insufficient.",
                "requiredCredits": exc.required_credits,
                "currentCredits": exc.current_credits,
            },
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    total = int(balance["monthly_credits"]) + int(balance["purchased_credits"])
    enough = total >= cost.amount
    if not enough:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "INSUFFICIENT_CREDITS",
                "message": "Credits are insufficient.",
                "requiredCredits": cost.amount,
                "currentCredits": total,
            },
        )


def _ensure_auto_top_up_credits(
    *,
    service: CreditService,
    settings: Settings,
    user_id: str,
    amount: int,
) -> dict[str, Any]:
    email = _AUTHENTICATED_USER_EMAILS.get(user_id, "").lower()
    auto_top_up_amount = (
        settings.auto_top_up_credit_amount
        if email and email in settings.auto_top_up_credit_emails
        else None
    )
    return service.ensure_available(
        user_id,
        amount,
        auto_top_up_amount=auto_top_up_amount,
        reason="trusted_account_auto_top_up",
    )


def _build_outcome_service(settings: Settings) -> ImprovementOutcomeService:
    if settings.supabase_url is None or settings.supabase_key is None:
        raise ValueError("SUPABASE_URL and Supabase key are required.")
    return ImprovementOutcomeService(
        repository=SupabaseRepository(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_key,
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


def _build_openai_llm_client(settings: Settings) -> OpenAIJSONClient | None:
    if not settings.openai_model or not os.getenv("OPENAI_API_KEY"):
        return None
    return OpenAIJSONClient(model=settings.openai_model)


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
        if ads is None:
            raise ValueError("ads payload is required; dummy workflow data has been removed.")
        self.ads = ads

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
        if lp is None:
            raise ValueError("lp payload is required; dummy workflow data has been removed.")
        self.lp = lp

    def fetch_structure(self) -> dict[str, Any]:
        return self.lp.structure.model_dump(mode="json", by_alias=True)

    def fetch_behavior(self) -> dict[str, Any]:
        return self.lp.behavior.model_dump(mode="json")

    def fetch_performance(self) -> dict[str, Any]:
        return self.lp.performance.model_dump(mode="json", by_alias=True)


def _dump_list(items: list[BaseModel]) -> list[dict[str, Any]]:
    return [item.model_dump(mode="json") for item in items]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.api.main:app", host="127.0.0.1", port=8000)
