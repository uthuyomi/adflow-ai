from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict


class Settings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ai_provider: Literal["mock", "openai"] = "mock"
    github_provider: Literal["memory", "github"] = "memory"
    storage_provider: Literal["memory", "supabase"] = "memory"
    openai_model: str | None = None
    openai_fast_model: str | None = "gpt-5.4-mini"
    openai_deep_model: str | None = "gpt-5.5"
    github_repository: str | None = None
    github_token: str | None = None
    supabase_url: str | None = None
    supabase_key: str | None = None
    supabase_table: str = "adflow_runs"
    grok_api_key: str | None = None
    grok_model: str | None = None
    gemini_api_key: str | None = None
    gemini_model: str | None = None
    evidence_collection_provider: str = "mock"
    evidence_embedding_provider: str = "fallback"
    openai_embedding_model: str = "text-embedding-3-small"
    evidence_max_items_default: int = 500
    evidence_max_items_deep: int = 3000
    product_review_min_evidence_for_high_confidence: int = 100
    product_review_enable_web_stub: bool = True
    monitoring_enable_auto_run: bool = False

    def validate_runtime(self) -> None:
        if self.ai_provider == "openai":
            if not os.getenv("OPENAI_API_KEY"):
                raise ValueError("OPENAI_API_KEY is required when ADFLOW_AI_PROVIDER=openai.")
            if not self.effective_openai_fast_model:
                raise ValueError("OPENAI_FAST_MODEL or OPENAI_MODEL is required when ADFLOW_AI_PROVIDER=openai.")
            if not self.effective_openai_deep_model:
                raise ValueError("OPENAI_DEEP_MODEL or OPENAI_MODEL is required when ADFLOW_AI_PROVIDER=openai.")

        if self.github_provider == "github":
            if not self.github_token:
                raise ValueError("GITHUB_TOKEN is required when ADFLOW_GITHUB_PROVIDER=github.")
            if not self.github_repository:
                raise ValueError(
                    "GITHUB_REPOSITORY is required when ADFLOW_GITHUB_PROVIDER=github.",
                )

        if self.storage_provider == "supabase":
            if not self.supabase_url:
                raise ValueError(
                    "SUPABASE_URL is required when ADFLOW_STORAGE_PROVIDER=supabase.",
                )
            if not self.supabase_key:
                raise ValueError(
                    "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required "
                    "when ADFLOW_STORAGE_PROVIDER=supabase.",
                )

    @property
    def effective_openai_fast_model(self) -> str | None:
        return self.openai_fast_model or self.openai_model

    @property
    def effective_openai_deep_model(self) -> str | None:
        return self.openai_deep_model or self.openai_model or self.effective_openai_fast_model


def _load_env_file(path: Path) -> None:
    if not path.exists() or not path.is_file():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def load_env_files() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    repo_root = backend_dir.parent
    _load_env_file(repo_root / ".env")
    _load_env_file(repo_root / ".env.local")
    _load_env_file(backend_dir / ".env")
    _load_env_file(backend_dir / ".env.local")


def load_settings() -> Settings:
    load_env_files()
    ai_provider = os.getenv("ADFLOW_AI_PROVIDER", "mock")
    if ai_provider == "openai_only":
        ai_provider = "openai"
    return Settings(
        ai_provider=ai_provider,
        github_provider=os.getenv("ADFLOW_GITHUB_PROVIDER", "memory"),
        storage_provider=os.getenv("ADFLOW_STORAGE_PROVIDER", "memory"),
        openai_model=os.getenv("OPENAI_MODEL"),
        openai_fast_model=os.getenv("OPENAI_FAST_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-5.4-mini",
        openai_deep_model=os.getenv("OPENAI_DEEP_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-5.5",
        github_repository=os.getenv("GITHUB_REPOSITORY"),
        github_token=os.getenv("GITHUB_TOKEN"),
        supabase_url=os.getenv("SUPABASE_URL"),
        supabase_key=(
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or os.getenv("SUPABASE_ANON_KEY")
        ),
        supabase_table=os.getenv("ADFLOW_SUPABASE_TABLE", "adflow_runs"),
        grok_api_key=os.getenv("GROK_API_KEY"),
        grok_model=os.getenv("GROK_MODEL"),
        gemini_api_key=os.getenv("GEMINI_API_KEY"),
        gemini_model=os.getenv("GEMINI_MODEL"),
        evidence_collection_provider=os.getenv("EVIDENCE_COLLECTION_PROVIDER", "mock"),
        evidence_embedding_provider=os.getenv("EVIDENCE_EMBEDDING_PROVIDER", "fallback"),
        openai_embedding_model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
        evidence_max_items_default=int(os.getenv("EVIDENCE_MAX_ITEMS_DEFAULT", "500")),
        evidence_max_items_deep=int(os.getenv("EVIDENCE_MAX_ITEMS_DEEP", "3000")),
        product_review_min_evidence_for_high_confidence=int(
            os.getenv("PRODUCT_REVIEW_MIN_EVIDENCE_FOR_HIGH_CONFIDENCE", "100"),
        ),
        product_review_enable_web_stub=os.getenv("PRODUCT_REVIEW_ENABLE_WEB_STUB", "true").lower()
        in {"1", "true", "yes", "on"},
        monitoring_enable_auto_run=os.getenv("MONITORING_ENABLE_AUTO_RUN", "false").lower()
        in {"1", "true", "yes", "on"},
    )
