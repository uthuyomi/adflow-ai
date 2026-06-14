from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from backend.services.ai.provider_registry import AIProviderRegistry
from backend.services.ai.providers.base import schema_for_agent_output
from backend.services.supabase.supabase_repository import SupabaseRepository


class RouteStep(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task: str
    agent_key: str
    provider: str
    role: str
    reason: str


class AgentOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str
    findings: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    score: float | None = None
    risk_level: str | None = None
    next_action: str | None = None
    confidence: float | None = None
    predicted_effect: dict[str, Any] = Field(default_factory=dict)


class AgentExecutionResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task: str
    agent_key: str
    provider: str
    provider_type: str
    failure_reason: str | None = None
    source_provider: str
    role: str
    input_summary: str
    output: AgentOutput


class OrchestrationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run: dict[str, Any]
    route_plan: list[RouteStep]
    agent_results: list[AgentExecutionResult]


@dataclass(frozen=True)
class AgentProfile:
    agent_key: str
    display_name: str
    provider: str
    role: str
    strengths: tuple[str, ...]
    default_tasks: tuple[str, ...]


DEFAULT_AGENTS: tuple[AgentProfile, ...] = (
    AgentProfile(
        agent_key="grok_x_copywriter",
        display_name="Grok X Copywriter",
        provider="grok",
        role="twitter_ad_copy",
        strengths=("X culture", "CTR hook", "short-form social copy"),
        default_tasks=("twitter_ad_improvement",),
    ),
    AgentProfile(
        agent_key="gemini_search_intent",
        display_name="Gemini Search Intent",
        provider="gemini",
        role="google_search_intent",
        strengths=("SEO", "Google Ads", "search intent"),
        default_tasks=("google_ad_improvement",),
    ),
    AgentProfile(
        agent_key="chatgpt_lp_reviewer",
        display_name="ChatGPT LP Reviewer",
        provider="openai",
        role="lp_review",
        strengths=("LP structure", "message consistency", "history analysis"),
        default_tasks=("lp_review", "analytics_diagnosis"),
    ),
    AgentProfile(
        agent_key="chatgpt_risk_reviewer",
        display_name="ChatGPT Risk Reviewer",
        provider="openai",
        role="risk_review",
        strengths=("brand safety", "claim review", "path risk"),
        default_tasks=("risk_review",),
    ),
    AgentProfile(
        agent_key="openai_direct_strategist",
        display_name="OpenAI Direct Strategist",
        provider="openai",
        role="openai_direct_analysis",
        strengths=("single-provider analysis", "structured recommendations", "review continuity"),
        default_tasks=("openai_pair_strategy", "openai_lp_review", "openai_risk_review"),
    ),
    AgentProfile(
        agent_key="codex_implementation",
        display_name="Codex Implementation",
        provider="codex",
        role="implementation",
        strengths=("React", "Tailwind", "diff planning"),
        default_tasks=("implementation_plan",),
    ),
)


class RuleBasedAIRouter:
    version = "rules.v2"

    def route(self, *, platform: str, objective: str) -> list[RouteStep]:
        normalized = platform.lower()
        steps: list[RouteStep] = []
        if normalized in {"twitter", "x", "twitter_ads", "x_ads"}:
            steps.append(
                self._step(
                    "twitter_ad_improvement",
                    "grok_x_copywriter",
                    "Twitter/X creative is routed to the SNS copy specialist.",
                ),
            )
        elif normalized in {"google", "google_ads", "search"}:
            steps.append(
                self._step(
                    "google_ad_improvement",
                    "gemini_search_intent",
                    "Google Ads work is routed to the search intent specialist.",
                ),
            )
        else:
            steps.append(
                self._step(
                    "analytics_diagnosis",
                    "chatgpt_lp_reviewer",
                    "Unknown platform starts with structural diagnosis.",
                ),
            )

        steps.extend(
            [
                self._step("lp_review", "chatgpt_lp_reviewer", "Ad and LP are evaluated as one conversion path."),
                self._step("risk_review", "chatgpt_risk_reviewer", "Review is separated from proposal generation."),
            ],
        )
        # Codex runs only through the audited Codex Task execution pipeline.
        # Proposal orchestration must finish before human approval and task creation.
        return steps

    @staticmethod
    def _step(task: str, agent_key: str, reason: str) -> RouteStep:
        profile = get_agent_profile(agent_key)
        return RouteStep(
            task=task,
            agent_key=profile.agent_key,
            provider=profile.provider,
            role=profile.role,
            reason=reason,
        )


class OpenAIOnlyAIRouter:
    version = "openai-only.v1"

    def route(self, *, platform: str, objective: str) -> list[RouteStep]:
        steps = [
            self._step("openai_pair_strategy", "Pair strategy and message-match diagnosis are handled by OpenAI."),
            self._step("openai_lp_review", "Landing page review is handled by OpenAI."),
            self._step("openai_risk_review", "Risk review stays separate while using OpenAI only."),
        ]
        if "implementation" in objective.lower() or "diff" in objective.lower():
            steps.append(self._step("openai_implementation_plan", "Implementation planning is handled by OpenAI."))
        return steps

    @staticmethod
    def _step(task: str, reason: str) -> RouteStep:
        return RouteStep(
            task=task,
            agent_key="openai_direct_strategist",
            provider="openai",
            role="openai_direct_analysis",
            reason=reason,
        )


class AIOrchestrator:
    def __init__(
        self,
        *,
        repository: SupabaseRepository,
        provider_registry: AIProviderRegistry | None = None,
        router: RuleBasedAIRouter | None = None,
    ) -> None:
        self.repository = repository
        self.provider_registry = provider_registry
        self.router = router or RuleBasedAIRouter()

    def ensure_default_agents(self, *, user_id: str) -> None:
        existing = self.repository.get_many("ai_agents", user_id=user_id)
        existing_keys = {item["agent_key"] for item in existing}
        for profile in DEFAULT_AGENTS:
            if profile.agent_key in existing_keys:
                continue
            self.repository.insert(
                "ai_agents",
                {
                    "user_id": user_id,
                    "agent_key": profile.agent_key,
                    "display_name": profile.display_name,
                    "provider": profile.provider,
                    "role": profile.role,
                    "strengths": list(profile.strengths),
                    "default_tasks": list(profile.default_tasks),
                    "is_enabled": True,
                },
            )

    def run_pair_pipeline(
        self,
        *,
        user_id: str,
        project_id: str | None,
        pair_id: str,
        platform: str,
        objective: str,
        context: dict[str, Any],
        mode: str = "multi_provider",
    ) -> OrchestrationResult:
        self.ensure_default_agents(user_id=user_id)
        router = OpenAIOnlyAIRouter() if mode == "openai_only" else self.router
        route_plan = self._rank_route_plan(
            user_id=user_id,
            platform=platform,
            route_plan=router.route(platform=platform, objective=objective),
            mode=mode,
        )
        run = self.repository.insert(
            "ai_orchestration_runs",
            {
                "user_id": user_id,
                "project_id": project_id,
                "ad_lp_pair_id": pair_id,
                "platform": platform,
                "objective": objective,
                "router_version": router.version,
                "route_plan": [step.model_dump(mode="json") for step in route_plan],
                "route_reason": self._route_reason(route_plan, mode=mode),
                "status": "running",
            },
        )

        try:
            results = [self._execute(step, context) for step in route_plan]
        except Exception:
            self.repository.update(
                "ai_orchestration_runs",
                user_id=user_id,
                filters={"id": run["id"]},
                payload={"status": "failed", "completed_at": datetime.now(timezone.utc).isoformat()},
            )
            raise
        for result in results:
            inserted = self.repository.insert(
                "ai_agent_results",
                {
                    "user_id": user_id,
                    "project_id": project_id,
                    "orchestration_run_id": run["id"],
                    "ad_lp_pair_id": pair_id,
                    "agent_key": result.agent_key,
                    "provider": result.provider,
                    "provider_type": result.provider_type,
                    "failure_reason": result.failure_reason,
                    "source_provider": result.source_provider,
                    "role": result.role,
                    "task": result.task,
                    "input_summary": result.input_summary,
                    "output": result.output.model_dump(mode="json"),
                    "score": result.output.score,
                    "risk_level": result.output.risk_level,
                    "confidence": result.output.confidence,
                    "predicted_effect": result.output.predicted_effect,
                    "status": "completed",
                    "decision_status": "GENERATED",
                },
            )
            self._update_scorecard(user_id=user_id, inserted=inserted, platform=platform, metric=self._metric_for_task(result.task))

        run = self.repository.update(
            "ai_orchestration_runs",
            user_id=user_id,
            filters={"id": run["id"]},
            payload={"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()},
        )
        return OrchestrationResult(run=run, route_plan=route_plan, agent_results=results)

    def list_runs(self, *, user_id: str, limit: int = 30) -> list[dict[str, Any]]:
        return self.repository.get_many("ai_orchestration_runs", user_id=user_id, order="created_at.desc", limit=limit)

    def list_scorecards(self, *, user_id: str) -> list[dict[str, Any]]:
        return self.repository.get_many("ai_agent_scorecards", user_id=user_id, order="router_score.desc")

    def list_agent_results_for_run(self, *, user_id: str, orchestration_run_id: str) -> list[dict[str, Any]]:
        return self.repository.get_many(
            "ai_agent_results",
            user_id=user_id,
            filters={"orchestration_run_id": orchestration_run_id},
            order="created_at.asc",
        )

    def set_result_decision(
        self,
        *,
        user_id: str,
        result_id: str,
        decision_status: str,
        decision_reason: str | None = None,
    ) -> dict[str, Any]:
        from backend.services.improvements.improvement_workflow_service import ImprovementWorkflowService

        result = ImprovementWorkflowService(self.repository).transition(
            user_id=user_id,
            improvement_id=result_id,
            new_status=decision_status,
            reason=decision_reason,
        )
        run = self.repository.get_one("ai_orchestration_runs", user_id=user_id, filters={"id": result["orchestration_run_id"]})
        self.recalculate_scorecard(
            user_id=user_id,
            agent_key=result["agent_key"],
            platform=run["platform"],
            metric=self._metric_for_task(result["task"]),
        )
        return result

    def build_codex_task_prompt(self, *, user_id: str, result_id: str) -> dict[str, Any]:
        result = self.repository.get_one("ai_agent_results", user_id=user_id, filters={"id": result_id})
        if result.get("decision_status") != "APPLY_READY":
            raise ValueError("AI result must be APPLY_READY before generating a Codex task.")
        if result.get("provider_type") != "REAL":
            raise ValueError("Mock AI results cannot generate Codex tasks.")
        output = result.get("output") or {}
        title = str(output.get("summary") or result.get("task") or "Approved AI proposal")[:80]
        prompt = {
            "title": title,
            "target_files_hint": ["frontend/app/...", "frontend/components/..."],
            "implementation_goal": output.get("summary") or "Implement the approved AI proposal safely.",
            "constraints": [
                "Do not change authentication or database access code unless explicitly required.",
                "Keep PR creation manual.",
                "Only implement the approved proposal, not new strategy.",
                "Preserve existing UI conventions and run the existing build check.",
            ],
            "acceptance_criteria": [
                "Relevant UI text or layout reflects the approved proposal.",
                "Mobile and desktop layouts remain usable.",
                "Existing build succeeds.",
                "No unrelated files are changed.",
            ],
            "source_ai_result_id": result_id,
        }
        return self.repository.insert(
            "codex_task_prompts",
            {
                "user_id": user_id,
                "project_id": result.get("project_id"),
                "source_ai_result_id": result_id,
                "title": title,
                "target_files_hint": prompt["target_files_hint"],
                "implementation_goal": prompt["implementation_goal"],
                "constraints": prompt["constraints"],
                "acceptance_criteria": prompt["acceptance_criteria"],
                "prompt": prompt,
                "status": "CREATED",
            },
        )

    def _execute(self, step: RouteStep, context: dict[str, Any]) -> AgentExecutionResult:
        ad = context.get("twitter_ad", {})
        lp = context.get("landing_page", {})
        history_count = len(context.get("history", []))
        message_match = float(context.get("message_match_score") or 0)
        input_summary = (
            f"ad={ad.get('name', 'unknown')}; lp={lp.get('name', 'unknown')}; "
            f"message_match={message_match}; history={history_count}"
        )
        payload = {**context, "task": step.task, "provider": step.provider, "input_summary": input_summary}
        provider = self.provider_registry.get(step.provider) if self.provider_registry else None
        output_payload = (
            provider.generate_structured(
                system_prompt=self._system_prompt_for(step),
                user_payload=payload,
                schema=schema_for_agent_output(),
                response_model=AgentOutput,
            )
            if provider
            else self._fallback_output(step, context)
        )
        provider_type = str(output_payload.pop("provider_type", "MOCK")).upper()
        if provider_type not in {"REAL", "MOCK"}:
            provider_type = "MOCK"
        failure_reason = output_payload.pop("failure_reason", None)
        source_provider = str(output_payload.pop("source_provider", step.provider))
        output = AgentOutput.model_validate(output_payload)
        return AgentExecutionResult(
            task=step.task,
            agent_key=step.agent_key,
            provider=step.provider,
            provider_type=provider_type,
            failure_reason=str(failure_reason) if failure_reason else None,
            source_provider=source_provider,
            role=step.role,
            input_summary=input_summary,
            output=output,
        )

    def _update_scorecard(self, *, user_id: str, inserted: dict[str, Any], platform: str, metric: str) -> None:
        if inserted.get("provider_type") != "REAL":
            return
        score = inserted.get("score")
        if score is None:
            return
        filters = {"agent_key": inserted["agent_key"], "platform": platform, "metric": metric}
        rows = self.repository.get_many("ai_agent_scorecards", user_id=user_id, filters=filters, limit=1)
        payload = {
            "sample_count": 1,
            "average_score": score,
            "router_score": score,
            "last_result_id": inserted["id"],
        }
        if not rows:
            self.repository.insert(
                "ai_agent_scorecards",
                {
                    "user_id": user_id,
                    "agent_key": inserted["agent_key"],
                    "provider": inserted["provider"],
                    "platform": platform,
                    "metric": metric,
                    **payload,
                },
            )
            return
        current = rows[0]
        sample_count = int(current["sample_count"]) + 1
        average_score = ((float(current["average_score"]) * int(current["sample_count"])) + float(score)) / sample_count
        self.repository.update(
            "ai_agent_scorecards",
            user_id=user_id,
            filters={"id": current["id"]},
            payload={
                "sample_count": sample_count,
                "average_score": round(average_score, 2),
                "router_score": round(float(current.get("router_score") or 0) + (float(score) / 100), 2),
                "last_result_id": inserted["id"],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    def recalculate_scorecard(self, *, user_id: str, agent_key: str, platform: str, metric: str) -> None:
        results = self.repository.get_many(
            "ai_agent_results",
            user_id=user_id,
            filters={"agent_key": agent_key, "provider_type": "REAL"},
            limit=200,
        )
        if not results:
            return
        accepted = [item for item in results if item.get("decision_status") in {"APPROVED", "APPLY_READY", "APPLIED"}]
        rejected = [item for item in results if item.get("decision_status") == "REJECTED"]
        apply_ready = [item for item in results if item.get("decision_status") == "APPLY_READY"]
        confidences = [float(item.get("confidence") or 0) for item in results]
        risks = [self._risk_penalty(item.get("risk_level")) for item in results]
        effects = [item.get("predicted_effect") or {} for item in results]
        avg_confidence = round(sum(confidences) / len(confidences), 2)
        avg_risk = round(sum(risks) / len(risks), 2)
        router_score = len(accepted) * 2 + len(apply_ready) * 3 - len(rejected) * 1.5 + avg_confidence - avg_risk
        payload = {
            "accepted_count": len(accepted),
            "rejected_count": len(rejected),
            "apply_ready_count": len(apply_ready),
            "avg_confidence": avg_confidence,
            "avg_risk": avg_risk,
            "estimated_ctr_lift": round(self._avg_effect(effects, "ctr_lift"), 2),
            "estimated_cvr_lift": round(self._avg_effect(effects, "cvr_lift"), 2),
            "estimated_bounce_reduction": round(self._avg_effect(effects, "bounce_reduction"), 2),
            "router_score": round(router_score, 2),
            "average_score": round(router_score, 2),
            "sample_count": len(results),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        rows = self.repository.get_many(
            "ai_agent_scorecards",
            user_id=user_id,
            filters={"agent_key": agent_key, "platform": platform, "metric": metric},
            limit=1,
        )
        if rows:
            self.repository.update("ai_agent_scorecards", user_id=user_id, filters={"id": rows[0]["id"]}, payload=payload)

    def _rank_route_plan(self, *, user_id: str, platform: str, route_plan: list[RouteStep], mode: str = "multi_provider") -> list[RouteStep]:
        if mode == "openai_only":
            return route_plan
        scorecards = self.repository.get_many("ai_agent_scorecards", user_id=user_id, filters={"platform": platform})
        scores = {item["agent_key"]: float(item.get("router_score") or item.get("average_score") or 0) for item in scorecards}
        ranked = sorted(
            route_plan,
            key=lambda step: self._base_priority(step, platform) + scores.get(step.agent_key, 0),
            reverse=True,
        )
        if platform.lower() in {"twitter", "x", "twitter_ads", "x_ads"} and scores.get("grok_x_copywriter", 0) < -2:
            backup = self.router._step("analytics_diagnosis", "chatgpt_lp_reviewer", "Grok score is low, so ChatGPT diagnosis is added.")
            if all(step.task != backup.task for step in ranked):
                ranked.append(backup)
        return ranked

    @staticmethod
    def _route_reason(route_plan: list[RouteStep], mode: str = "multi_provider") -> str:
        names = ", ".join(f"{step.task}->{step.provider}" for step in route_plan)
        if mode == "openai_only":
            return f"OpenAI-only mode selected one provider path: {names}."
        return f"Rule-based router selected specialized desks: {names}."

    @staticmethod
    def _metric_for_task(task: str) -> str:
        if "ad" in task:
            return "ctr_fit"
        if "lp" in task:
            return "cvr_fit"
        if "risk" in task:
            return "safety_fit"
        if "implementation" in task:
            return "diff_readiness"
        return "diagnosis_fit"

    @staticmethod
    def _base_priority(step: RouteStep, platform: str) -> float:
        if platform.lower() in {"twitter", "x", "twitter_ads", "x_ads"} and step.provider == "grok":
            return 10
        if platform.lower() in {"google", "google_ads", "search"} and step.provider == "gemini":
            return 10
        if step.task == "risk_review":
            return 8
        return 5

    @staticmethod
    def _system_prompt_for(step: RouteStep) -> str:
        return (
            f"You are the {step.role} specialist in an AI advertising OS. "
            "Return only JSON matching the schema. Be evidence-based, avoid exaggerated claims, "
            "include confidence from 0 to 1, and estimate effects cautiously."
        )

    @staticmethod
    def _fallback_output(step: RouteStep, context: dict[str, Any]) -> dict[str, Any]:
        features = context.get("features", {})
        message_match = float(context.get("message_match_score") or 0)
        return {
            "summary": f"{step.provider} proposal for {step.task}.",
            "findings": [f"Message match score is {message_match}."],
            "recommendations": ["Align ad promise and LP hero before broad changes."],
            "score": features.get("hero_similarity") or message_match,
            "risk_level": "medium" if message_match < 45 else "low",
            "next_action": "Review before marking apply-ready.",
            "confidence": 0.65,
            "predicted_effect": {"ctr_lift": 1.0, "cvr_lift": 0.5, "bounce_reduction": 2.0},
            "provider_type": "MOCK",
            "failure_reason": "No AI provider registry was configured.",
            "source_provider": step.provider,
        }

    @staticmethod
    def _risk_penalty(risk_level: Any) -> float:
        return {"low": 0.1, "medium": 0.5, "high": 1.0}.get(str(risk_level), 0.4)

    @staticmethod
    def _avg_effect(effects: list[dict[str, Any]], key: str) -> float:
        values = [float(item.get(key) or 0) for item in effects]
        return sum(values) / len(values) if values else 0


def get_agent_profile(agent_key: str) -> AgentProfile:
    for profile in DEFAULT_AGENTS:
        if profile.agent_key == agent_key:
            return profile
    raise ValueError(f"Unknown agent profile: {agent_key}")
