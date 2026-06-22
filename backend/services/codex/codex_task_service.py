from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import subprocess
import threading
from typing import Any

from backend.core.config import Settings
from backend.services.billing.credits import CREDIT_COSTS, CreditService
from backend.services.codex.isolated_workspace import IsolatedWorkspaceManager
from backend.services.github.github_integration_service import GitHubIntegrationService
from backend.services.orchestration.ai_orchestrator import AIOrchestrator
from backend.services.outcomes.improvement_outcome_service import ImprovementOutcomeService
from backend.services.supabase.supabase_repository import SupabaseRepository


CODEX_TASK_STATUSES = ("CREATED", "QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED", "PR_CREATED", "OUTCOME_CREATED")
ALLOWED_TRANSITIONS = {
    "CREATED": {"QUEUED", "CANCELLED"},
    "QUEUED": {"RUNNING", "CANCELLED"},
    "RUNNING": {"SUCCEEDED", "FAILED", "CANCELLED"},
    "FAILED": {"QUEUED"},
    "SUCCEEDED": {"PR_CREATED", "OUTCOME_CREATED"},
    "PR_CREATED": {"OUTCOME_CREATED"},
    "CANCELLED": set(),
    "OUTCOME_CREATED": set(),
}
_PROCESSES: dict[str, subprocess.Popen[str]] = {}
_PROCESS_LOCK = threading.Lock()


class CodexTaskService:
    def __init__(self, *, repository: SupabaseRepository, settings: Settings) -> None:
        self.repository = repository
        self.settings = settings
        self.credits = CreditService(repository)

    def create_task(self, *, user_id: str, improvement_id: str, idempotency_key: str) -> dict[str, Any]:
        existing = self.repository.get_many("codex_task_prompts", user_id=user_id, filters={"source_ai_result_id": improvement_id}, order="created_at.desc", limit=1)
        if existing:
            return existing[0]
        cost = CREDIT_COSTS["codex_task"]
        self.credits.consume_idempotent(user_id=user_id, amount=cost.amount, reason=cost.reason, idempotency_key=f"codex-task:{idempotency_key}", metadata={"improvement_id": improvement_id})
        try:
            task = AIOrchestrator(repository=self.repository).build_codex_task_prompt(user_id=user_id, result_id=improvement_id)
            task = self.repository.update("codex_task_prompts", user_id=user_id, filters={"id": task["id"]}, payload={"status": "CREATED", "summary": task.get("implementation_goal"), "updated_by": user_id})
            self._history(user_id, task, None, "CREATED", "Codex task created.")
            return task
        except Exception:
            self.credits.refund_idempotent(user_id=user_id, amount=cost.amount, reason="CODEX_TASK_CREATION_REFUND", idempotency_key=f"refund:codex-task:{idempotency_key}", metadata={"improvement_id": improvement_id})
            raise

    def list_tasks(self, *, user_id: str, project_id: str | None = None, improvement_id: str | None = None, status: str | None = None, search: str | None = None, sort: str = "desc", page: int = 1, page_size: int = 25) -> dict[str, Any]:
        filters: dict[str, Any] = {}
        if project_id:
            filters["project_id"] = project_id
        if improvement_id:
            filters["source_ai_result_id"] = improvement_id
        if status:
            filters["status"] = self._status(status)
        rows = self.repository.get_many("codex_task_prompts", user_id=user_id, filters=filters, order=f"created_at.{sort}", limit=500)
        query = (search or "").strip().lower()
        if query:
            rows = [row for row in rows if query in f"{row.get('title', '')} {row.get('summary', '')} {row.get('implementation_goal', '')}".lower()]
        start = max(page - 1, 0) * page_size
        return {"items": rows[start : start + page_size], "total": len(rows), "page": page, "page_size": page_size}

    def detail(self, *, user_id: str, task_id: str) -> dict[str, Any]:
        task = self._task(user_id, task_id)
        result = self.repository.get_one("ai_agent_results", user_id=user_id, filters={"id": task["source_ai_result_id"]})
        project = self._optional("ad_projects", user_id, task.get("project_id"))
        pair = self._optional("ad_lp_pairs", user_id, result.get("ad_lp_pair_id"))
        ad = self._optional("twitter_ads", user_id, pair.get("twitter_ad_id") if pair else None)
        lp = self._optional("landing_pages", user_id, pair.get("landing_page_id") if pair else None)
        return {
            "task": task,
            "improvement": result,
            "project": project,
            "pair": pair,
            "ad": ad,
            "landing_page": lp,
            "history": self.repository.get_many("codex_task_status_history", user_id=user_id, filters={"task_id": task_id}, order="changed_at.asc"),
            "executions": self.repository.get_many("codex_task_executions", user_id=user_id, filters={"task_id": task_id}, order="created_at.desc"),
            "pull_requests": self.repository.get_many("github_pull_requests", user_id=user_id, filters={"codex_task_id": task_id}, order="created_at.desc"),
            "outcomes": self.repository.get_many("improvement_outcomes", user_id=user_id, filters={"source_codex_task_id": task_id}, order="created_at.desc"),
        }

    def execute_manual(self, *, user_id: str, task_id: str, idempotency_key: str, summary: str, stdout: str | None, stderr: str | None, files_changed: list[dict[str, Any]], diff_summary: str | None, succeeded: bool = True, error_code: str | None = None) -> dict[str, Any]:
        execution = self._begin_execution(user_id=user_id, task_id=task_id, mode="MANUAL_EXECUTION", idempotency_key=idempotency_key)
        if execution["status"] in {"SUCCEEDED", "FAILED", "CANCELLED"}:
            return {"task": self._task(user_id, task_id), "execution": execution}
        return self._finish_execution(user_id=user_id, task_id=task_id, execution=execution, succeeded=succeeded, summary=summary, stdout=stdout, stderr=stderr, files_changed=files_changed, diff_summary=diff_summary, error_code=error_code)

    def execute_real(
        self,
        *,
        user_id: str,
        task_id: str,
        idempotency_key: str,
        repository_selection_id: str | None = None,
    ) -> dict[str, Any]:
        task = self._task(user_id, task_id)
        if not shutil.which(self.settings.codex_executable):
            raise ValueError("Codex CLI is not available.")
        if not repository_selection_id:
            previous = self.repository.get_many(
                "codex_task_executions",
                user_id=user_id,
                filters={"task_id": task_id},
                order="created_at.desc",
                limit=1,
            )
            repository_selection_id = str(previous[0].get("repository_selection_id") or "") if previous else ""
        if not repository_selection_id:
            raise ValueError("A GitHub repository selection is required for REAL_EXECUTION.")
        github = self._github()
        selection, installation_token = github.installation_token_for_selection(
            user_id=user_id,
            repository_selection_id=repository_selection_id,
        )
        execution = self._begin_execution(user_id=user_id, task_id=task_id, mode="REAL_EXECUTION", idempotency_key=idempotency_key)
        if execution["status"] in {"SUCCEEDED", "FAILED", "CANCELLED"}:
            return {"task": self._task(user_id, task_id), "execution": execution}
        execution = self.repository.update(
            "codex_task_executions",
            user_id=user_id,
            filters={"id": execution["id"]},
            payload={
                "repository_selection_id": repository_selection_id,
                "repository": selection["repository_full_name"],
                "base_branch": selection["default_branch"],
                "workspace_strategy": "ISOLATED_CLONE",
            },
        )
        manager = IsolatedWorkspaceManager(
            root=self.settings.codex_workspace_root,
            runner_user=self.settings.codex_runner_user,
        )
        process: subprocess.Popen[str] | None = None
        try:
            with manager.clone(
                repository=selection["repository_full_name"],
                branch=selection["default_branch"],
                token=installation_token,
            ) as workspace:
                prompt = self._execution_prompt(task)
                process = subprocess.Popen(
                    manager.command(self.settings.codex_executable, workspace, prompt),
                    cwd=workspace.repository,
                    env=manager.codex_environment(workspace),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                )
                with _PROCESS_LOCK:
                    _PROCESSES[task_id] = process
                stdout, stderr = process.communicate(timeout=self.settings.codex_execution_timeout_seconds)
                files = self._changed_files(workspace.repository)
                return self._finish_execution(
                    user_id=user_id,
                    task_id=task_id,
                    execution=execution,
                    succeeded=process.returncode == 0,
                    summary="Codex CLI execution completed." if process.returncode == 0 else "Codex CLI execution failed.",
                    stdout=stdout,
                    stderr=stderr,
                    files_changed=files,
                    diff_summary=self._diff_summary(workspace.repository),
                    error_code=None if process.returncode == 0 else "CODEX_CLI_FAILED",
                )
        except subprocess.TimeoutExpired:
            if process:
                process.kill()
                stdout, stderr = process.communicate()
            else:
                stdout, stderr = "", "Codex process did not start."
            return self._finish_execution(user_id=user_id, task_id=task_id, execution=execution, succeeded=False, summary="Codex CLI execution timed out.", stdout=stdout, stderr=stderr, files_changed=[], diff_summary=None, error_code="CODEX_TIMEOUT")
        except Exception as exc:
            return self._finish_execution(user_id=user_id, task_id=task_id, execution=execution, succeeded=False, summary="Codex CLI execution failed before completion.", stdout=None, stderr=str(exc), files_changed=[], diff_summary=None, error_code="CODEX_EXECUTION_ERROR")
        finally:
            with _PROCESS_LOCK:
                _PROCESSES.pop(task_id, None)

    def cancel(self, *, user_id: str, task_id: str, reason: str) -> dict[str, Any]:
        task = self._task(user_id, task_id)
        if task["status"] not in {"CREATED", "QUEUED", "RUNNING"}:
            raise ValueError("Only CREATED, QUEUED, or RUNNING tasks can be cancelled.")
        with _PROCESS_LOCK:
            process = _PROCESSES.get(task_id)
            if process and process.poll() is None:
                process.terminate()
        executions = self.repository.get_many("codex_task_executions", user_id=user_id, filters={"task_id": task_id, "status": ["QUEUED", "RUNNING"]}, order="created_at.desc", limit=1)
        execution_id = executions[0]["id"] if executions else None
        if executions:
            execution = self.repository.update("codex_task_executions", user_id=user_id, filters={"id": execution_id}, payload={"status": "CANCELLED", "finished_at": _now(), "error_code": "CANCELLED", "error_message": reason})
            cost = CREDIT_COSTS["codex_execution"]
            self.credits.refund_idempotent(user_id=user_id, amount=cost.amount, reason="CODEX_EXECUTION_CANCEL_REFUND", idempotency_key=f"refund:codex-execution:{execution['idempotency_key']}", metadata={"task_id": task_id, "execution_id": execution_id})
        return self._transition(user_id, task, "CANCELLED", reason, execution_id=execution_id)

    def create_pr(self, *, user_id: str, task_id: str, execution_id: str, repository_selection_id: str, idempotency_key: str) -> dict[str, Any]:
        task = self._task(user_id, task_id)
        existing = self.repository.get_many("github_pull_requests", user_id=user_id, filters={"codex_task_id": task_id}, order="created_at.desc", limit=1)
        if existing and existing[0].get("status") != "FAILED":
            return {"task": task, "pull_request": existing[0]}
        if task["status"] != "SUCCEEDED":
            raise ValueError("Codex task must be SUCCEEDED before creating a PR.")
        execution = self.repository.get_one("codex_task_executions", user_id=user_id, filters={"id": execution_id, "task_id": task_id})
        files = execution.get("files_changed") or []
        if not files:
            raise ValueError("Codex execution did not produce files for a GitHub PR.")
        cost = CREDIT_COSTS["codex_github_pr"]
        self.credits.consume_idempotent(user_id=user_id, amount=cost.amount, reason=cost.reason, idempotency_key=f"codex-pr:{idempotency_key}", metadata={"task_id": task_id, "execution_id": execution_id})
        try:
            pr = self._github().create_pull_request(
                user_id=user_id, improvement_id=task["source_ai_result_id"], repository_selection_id=repository_selection_id, files=files, codex_task_id=task_id, codex_execution_id=execution_id, title=task["title"]
            )
            updated = self._transition(user_id, task, "PR_CREATED", "GitHub PR created.", execution_id=execution_id, related_pr_id=pr["id"], payload={"pr_url": pr["pr_url"]})
            return {"task": updated, "pull_request": pr}
        except Exception:
            self.credits.refund_idempotent(user_id=user_id, amount=cost.amount, reason="CODEX_PR_FAILURE_REFUND", idempotency_key=f"refund:codex-pr:{idempotency_key}", metadata={"task_id": task_id})
            raise

    def create_outcome(self, *, user_id: str, task_id: str, idempotency_key: str) -> dict[str, Any]:
        task = self._task(user_id, task_id)
        existing = self.repository.get_many("improvement_outcomes", user_id=user_id, filters={"source_codex_task_id": task_id}, limit=1)
        if existing:
            if task["status"] in {"SUCCEEDED", "PR_CREATED"}:
                task = self._transition(user_id, task, "OUTCOME_CREATED", "Existing outcome draft linked.", related_outcome_id=existing[0]["id"], payload={"outcome_id": existing[0]["id"]})
            return {"task": task, "outcome": existing[0]}
        if task["status"] not in {"SUCCEEDED", "PR_CREATED"}:
            raise ValueError("Codex task must be SUCCEEDED or PR_CREATED before creating an outcome.")
        cost = CREDIT_COSTS["codex_outcome"]
        self.credits.consume_idempotent(user_id=user_id, amount=cost.amount, reason=cost.reason, idempotency_key=f"codex-outcome:{idempotency_key}", metadata={"task_id": task_id})
        try:
            outcome = ImprovementOutcomeService(repository=self.repository).create_from_codex_task(user_id=user_id, task_id=task_id)
            outcome = self.repository.update_improvement_outcome(user_id=user_id, outcome_id=outcome["id"], payload={"outcome_status": "PENDING_MEASUREMENT"})
            updated = self._transition(user_id, task, "OUTCOME_CREATED", "Outcome draft created.", related_outcome_id=outcome["id"], payload={"outcome_id": outcome["id"]})
            return {"task": updated, "outcome": outcome}
        except Exception:
            self.credits.refund_idempotent(user_id=user_id, amount=cost.amount, reason="CODEX_OUTCOME_FAILURE_REFUND", idempotency_key=f"refund:codex-outcome:{idempotency_key}", metadata={"task_id": task_id})
            raise

    def _begin_execution(self, *, user_id: str, task_id: str, mode: str, idempotency_key: str) -> dict[str, Any]:
        if mode == "MOCK":
            raise ValueError("MOCK execution is not allowed.")
        existing = self.repository.get_many("codex_task_executions", user_id=user_id, filters={"idempotency_key": idempotency_key}, limit=1)
        if existing:
            return existing[0]
        task = self._task(user_id, task_id)
        if task["status"] not in {"CREATED", "FAILED"}:
            raise ValueError("Codex task cannot be executed from its current status.")
        cost = CREDIT_COSTS["codex_execution"]
        self.credits.consume_idempotent(user_id=user_id, amount=cost.amount, reason=cost.reason, idempotency_key=f"codex-execution:{idempotency_key}", metadata={"task_id": task_id, "mode": mode})
        queued = self._transition(user_id, task, "QUEUED", f"{mode} queued.", payload={"execution_mode": mode})
        execution = self.repository.insert("codex_task_executions", {"task_id": task_id, "user_id": user_id, "execution_mode": mode, "status": "QUEUED", "idempotency_key": idempotency_key, "operator_user_id": user_id})
        self._transition(user_id, queued, "RUNNING", f"{mode} started.", execution_id=execution["id"], payload={"last_run_at": _now()})
        return self.repository.update("codex_task_executions", user_id=user_id, filters={"id": execution["id"]}, payload={"status": "RUNNING", "started_at": _now()})

    def _finish_execution(self, *, user_id: str, task_id: str, execution: dict[str, Any], succeeded: bool, summary: str, stdout: str | None, stderr: str | None, files_changed: list[dict[str, Any]], diff_summary: str | None, error_code: str | None) -> dict[str, Any]:
        status = "SUCCEEDED" if succeeded else "FAILED"
        execution = self.repository.update("codex_task_executions", user_id=user_id, filters={"id": execution["id"]}, payload={"status": status, "finished_at": _now(), "stdout": stdout, "stderr": stderr, "summary": summary, "files_changed": files_changed, "diff_summary": diff_summary, "error_message": stderr if not succeeded else None, "error_code": error_code})
        task = self._task(user_id, task_id)
        if task["status"] == "CANCELLED":
            execution = self.repository.update("codex_task_executions", user_id=user_id, filters={"id": execution["id"]}, payload={"status": "CANCELLED", "error_code": "CANCELLED", "error_message": "Execution cancelled by user."})
            return {"task": task, "execution": execution}
        task = self._transition(user_id, task, status, summary, execution_id=execution["id"], payload={"result_summary": summary, "error_message": execution.get("error_message"), "error_code": error_code})
        if not succeeded:
            cost = CREDIT_COSTS["codex_execution"]
            self.credits.refund_idempotent(user_id=user_id, amount=cost.amount, reason="CODEX_EXECUTION_FAILURE_REFUND", idempotency_key=f"refund:codex-execution:{execution['idempotency_key']}", metadata={"task_id": task_id, "execution_id": execution["id"]})
        return {"task": task, "execution": execution}

    def _transition(self, user_id: str, task: dict[str, Any], status: str, reason: str, *, execution_id: str | None = None, related_pr_id: str | None = None, related_outcome_id: str | None = None, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        old = task["status"]
        if status not in ALLOWED_TRANSITIONS.get(old, set()):
            raise ValueError(f"Invalid Codex task status transition: {old} -> {status}")
        updated = self.repository.update("codex_task_prompts", user_id=user_id, filters={"id": task["id"], "status": old}, payload={"status": status, "updated_by": user_id, **(payload or {})})
        self._history(user_id, updated, old, status, reason, execution_id=execution_id, related_pr_id=related_pr_id, related_outcome_id=related_outcome_id)
        return updated

    def _history(self, user_id: str, task: dict[str, Any], old_status: str | None, new_status: str, reason: str, *, execution_id: str | None = None, related_pr_id: str | None = None, related_outcome_id: str | None = None) -> None:
        self.repository.insert("codex_task_status_history", {"task_id": task["id"], "user_id": user_id, "old_status": old_status, "new_status": new_status, "changed_by": user_id, "reason": reason, "execution_id": execution_id, "related_pr_id": related_pr_id, "related_outcome_id": related_outcome_id})

    def _task(self, user_id: str, task_id: str) -> dict[str, Any]:
        return self.repository.get_one("codex_task_prompts", user_id=user_id, filters={"id": task_id})

    def _optional(self, table: str, user_id: str, record_id: str | None) -> dict[str, Any] | None:
        if not record_id:
            return None
        rows = self.repository.get_many(table, user_id=user_id, filters={"id": record_id}, limit=1)
        return rows[0] if rows else None

    @staticmethod
    def _status(status: str) -> str:
        value = status.upper()
        if value not in CODEX_TASK_STATUSES:
            raise ValueError("Invalid Codex task status.")
        return value

    @staticmethod
    def _execution_prompt(task: dict[str, Any]) -> str:
        return f"Implement only this approved task. Run relevant tests. Do not commit or push.\\n\\n{json.dumps(task.get('prompt') or {}, ensure_ascii=False)}"

    @staticmethod
    def _changed_files(worktree: Path) -> list[dict[str, Any]]:
        output = subprocess.check_output(
            ["git", "-c", f"safe.directory={worktree}", "status", "--porcelain=v1", "-uall"],
            cwd=worktree,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        files = []
        for line in output.splitlines():
            path = line[3:].strip()
            full = worktree / path
            if full.is_file():
                files.append({"path": path.replace("\\", "/"), "content": full.read_text(encoding="utf-8", errors="replace")})
            elif line[:2].strip() == "D":
                files.append({"path": path.replace("\\", "/"), "deleted": True})
        return files

    @staticmethod
    def _diff_summary(worktree: Path) -> str:
        status = subprocess.run(
            ["git", "-c", f"safe.directory={worktree}", "status", "--short"],
            cwd=worktree,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        ).stdout.strip()
        stat = subprocess.run(
            ["git", "-c", f"safe.directory={worktree}", "diff", "--stat"],
            cwd=worktree,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        ).stdout.strip()
        return "\n".join(part for part in (stat, status) if part)

    def configuration(self) -> dict[str, Any]:
        return {
            "real_execution_enabled": bool(
                shutil.which(self.settings.codex_executable)
                and self.settings.github_app_id
                and self.settings.github_app_private_key
                and self.settings.github_app_client_id
                and (os.getenv("CODEX_API_KEY") or os.getenv("CODEX_ACCESS_TOKEN"))
            ),
            "manual_execution_enabled": True,
            "mock_execution_enabled": False,
            "workspace_strategy": "ISOLATED_CLONE",
        }

    def _github(self) -> GitHubIntegrationService:
        return GitHubIntegrationService(
            self.repository,
            app_id=self.settings.github_app_id,
            private_key=self.settings.github_app_private_key,
            client_id=self.settings.github_app_client_id,
            webhook_secret=self.settings.github_webhook_secret,
            callback_url=self.settings.github_app_callback_url,
            frontend_url=self.settings.frontend_app_url,
        )


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
