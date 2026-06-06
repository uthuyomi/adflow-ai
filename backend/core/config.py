from __future__ import annotations

import os
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Settings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ai_provider: Literal["mock", "openai"] = "mock"
    github_provider: Literal["memory", "github"] = "memory"
    storage_provider: Literal["memory", "supabase"] = "memory"
    openai_model: str | None = None
    openai_deep_model: str | None = None
    github_repository: str | None = None
    github_token: str | None = None
    supabase_url: str | None = None
    supabase_key: str | None = None
    supabase_table: str = "adflow_runs"
    grok_api_key: str | None = None
    grok_model: str | None = None
    gemini_api_key: str | None = None
    gemini_model: str | None = None
    demand_real_sources_enabled: bool = False
    demand_synthetic_fallback: bool = True
    demand_max_signals_per_run: int = 5000
    demand_max_signals_per_source: int = 1000
    demand_connector_timeout_seconds: int = 20
    demand_connector_max_retries: int = 2
    x_api_bearer_token: str | None = None
    youtube_api_key: str | None = None
    google_custom_search_api_key: str | None = None
    google_custom_search_engine_id: str | None = None
    reddit_client_id: str | None = None
    reddit_client_secret: str | None = None
    reddit_user_agent: str | None = None
    demand_embedding_provider: str = "deterministic"
    demand_embedding_model: str = "deterministic-hash-embedding.v1"
    openai_embedding_model: str = "text-embedding-3-small"
    auto_top_up_credit_emails: set[str] = Field(default_factory=set)
    auto_top_up_credit_amount: int = 5000

    def validate_runtime(self) -> None:
        if self.ai_provider == "openai":
            if not os.getenv("OPENAI_API_KEY"):
                raise ValueError("OPENAI_API_KEY is required when ADFLOW_AI_PROVIDER=openai.")
            if not self.openai_model:
                raise ValueError("OPENAI_FAST_MODEL or OPENAI_MODEL is required when ADFLOW_AI_PROVIDER=openai.")

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


def load_settings() -> Settings:
    return Settings(
        ai_provider=os.getenv("ADFLOW_AI_PROVIDER", "mock"),
        github_provider=os.getenv("ADFLOW_GITHUB_PROVIDER", "memory"),
        storage_provider=os.getenv("ADFLOW_STORAGE_PROVIDER", "memory"),
        openai_model=os.getenv("OPENAI_FAST_MODEL") or os.getenv("OPENAI_MODEL"),
        openai_deep_model=os.getenv("OPENAI_DEEP_MODEL"),
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
        demand_real_sources_enabled=_env_bool("DEMAND_REAL_SOURCES_ENABLED", False),
        demand_synthetic_fallback=_env_bool("DEMAND_SYNTHETIC_FALLBACK", True),
        demand_max_signals_per_run=int(os.getenv("DEMAND_MAX_SIGNALS_PER_RUN", "5000")),
        demand_max_signals_per_source=int(os.getenv("DEMAND_MAX_SIGNALS_PER_SOURCE", "1000")),
        demand_connector_timeout_seconds=int(os.getenv("DEMAND_CONNECTOR_TIMEOUT_SECONDS", "20")),
        demand_connector_max_retries=int(os.getenv("DEMAND_CONNECTOR_MAX_RETRIES", "2")),
        x_api_bearer_token=os.getenv("X_API_BEARER_TOKEN"),
        youtube_api_key=os.getenv("YOUTUBE_API_KEY"),
        google_custom_search_api_key=os.getenv("GOOGLE_CUSTOM_SEARCH_API_KEY"),
        google_custom_search_engine_id=os.getenv("GOOGLE_CUSTOM_SEARCH_ENGINE_ID"),
        reddit_client_id=os.getenv("REDDIT_CLIENT_ID"),
        reddit_client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
        reddit_user_agent=os.getenv("REDDIT_USER_AGENT"),
        demand_embedding_provider=os.getenv("DEMAND_EMBEDDING_PROVIDER", "deterministic"),
        demand_embedding_model=os.getenv("DEMAND_EMBEDDING_MODEL", "deterministic-hash-embedding.v1"),
        openai_embedding_model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
        auto_top_up_credit_emails=_env_set("ADFLOW_AUTO_TOP_UP_CREDIT_EMAILS"),
        auto_top_up_credit_amount=int(os.getenv("ADFLOW_AUTO_TOP_UP_CREDIT_AMOUNT", "5000")),
    )


def _env_bool(key: str, default: bool) -> bool:
    value = os.getenv(key)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_set(key: str) -> set[str]:
    value = os.getenv(key)
    if not value:
        return set()
    return {item.strip().lower() for item in value.split(",") if item.strip()}
