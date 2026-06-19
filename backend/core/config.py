from __future__ import annotations

import os
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Settings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    deployment_environment: Literal["development", "test", "production"] = "development"
    ai_provider: Literal["mock", "openai"] = "mock"
    github_provider: Literal["memory", "github"] = "memory"
    storage_provider: Literal["memory", "supabase"] = "memory"
    openai_model: str | None = None
    openai_deep_model: str | None = None
    github_repository: str | None = None
    github_token: str | None = None
    github_token_encryption_key: str | None = None
    github_oauth_client_id: str | None = None
    github_oauth_client_secret: str | None = None
    github_oauth_callback_url: str = "http://127.0.0.1:8000/integrations/github/oauth/callback"
    github_sync_enabled: bool = True
    github_sync_interval_seconds: int = Field(default=300, ge=30)
    experiment_sync_enabled: bool = False
    codex_executable: str = "codex"
    codex_workspace: str | None = None
    codex_execution_timeout_seconds: int = Field(default=1800, ge=30)
    supabase_url: str | None = None
    supabase_key: str | None = None
    supabase_table: str = "adflow_runs"
    grok_api_key: str | None = None
    grok_model: str | None = None
    gemini_api_key: str | None = None
    gemini_model: str | None = None
    demand_real_sources_enabled: bool = True
    demand_synthetic_fallback: bool = False
    demand_max_signals_per_run: int = 5000
    demand_max_signals_per_source: int = 1000
    demand_connector_timeout_seconds: int = 20
    demand_connector_max_retries: int = 2
    x_api_bearer_token: str | None = None
    reddit_user_agent: str = "adflow-ai-demand-research/1.0"
    reddit_client_id: str | None = None
    reddit_client_secret: str | None = None
    x_ads_consumer_key: str | None = None
    x_ads_consumer_secret: str | None = None
    x_ads_token_encryption_key: str | None = None
    x_ads_api_base_url: str = "https://ads-api.x.com/12"
    x_ads_oauth_base_url: str = "https://api.x.com/oauth"
    x_ads_oauth_callback_url: str = "http://127.0.0.1:8000/integrations/x-ads/oauth/callback"
    frontend_app_url: str = "http://localhost:3000"
    x_api_base_url: str = "https://api.x.com/2"
    google_custom_search_api_key: str | None = None
    google_custom_search_engine_id: str | None = None
    firecrawl_api_key: str | None = None
    firecrawl_search_enabled: bool = True
    firecrawl_search_max_queries: int = Field(default=4, ge=1, le=10)
    firecrawl_search_results_per_query: int = Field(default=10, ge=1, le=10)
    firecrawl_search_max_results_per_run: int = Field(default=30, ge=1, le=100)
    firecrawl_max_urls_per_run: int = 8
    firecrawl_max_age_ms: int = 172800000
    firecrawl_timeout_ms: int = 60000
    demand_embedding_provider: str = "deterministic"
    demand_embedding_model: str = "deterministic-hash-embedding.v1"
    openai_embedding_model: str = "text-embedding-3-small"
    auto_top_up_credit_emails: set[str] = Field(default_factory=set)
    auto_top_up_credit_amount: int = 5000
    lp_snapshot_cron_secret: str | None = None
    lp_snapshot_user_id: str | None = None
    lp_snapshot_project_id: str | None = None
    lp_snapshot_pair_id: str | None = None
    lp_snapshot_query: str = "demand validation software for solo SaaS founders"

    def validate_runtime(self) -> None:
        if self.deployment_environment == "production":
            if self.ai_provider != "openai":
                raise ValueError("Production requires ADFLOW_AI_PROVIDER=openai.")
            if self.storage_provider != "supabase":
                raise ValueError("Production requires ADFLOW_STORAGE_PROVIDER=supabase.")
            if self.demand_synthetic_fallback:
                raise ValueError("Production requires DEMAND_SYNTHETIC_FALLBACK=false.")

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
        deployment_environment=os.getenv("ADFLOW_ENV", "development"),
        ai_provider=os.getenv("ADFLOW_AI_PROVIDER", "mock"),
        github_provider=os.getenv("ADFLOW_GITHUB_PROVIDER", "memory"),
        storage_provider=os.getenv("ADFLOW_STORAGE_PROVIDER", "memory"),
        openai_model=os.getenv("OPENAI_FAST_MODEL") or os.getenv("OPENAI_MODEL"),
        openai_deep_model=os.getenv("OPENAI_DEEP_MODEL"),
        github_repository=os.getenv("GITHUB_REPOSITORY"),
        github_token=os.getenv("GITHUB_TOKEN"),
        github_token_encryption_key=os.getenv("GITHUB_TOKEN_ENCRYPTION_KEY") or os.getenv("X_ADS_TOKEN_ENCRYPTION_KEY"),
        github_oauth_client_id=os.getenv("GITHUB_OAUTH_CLIENT_ID"),
        github_oauth_client_secret=os.getenv("GITHUB_OAUTH_CLIENT_SECRET"),
        github_oauth_callback_url=os.getenv("GITHUB_OAUTH_CALLBACK_URL", "http://127.0.0.1:8000/integrations/github/oauth/callback"),
        github_sync_enabled=_env_bool("GITHUB_SYNC_ENABLED", True),
        github_sync_interval_seconds=int(os.getenv("GITHUB_SYNC_INTERVAL_SECONDS", "300")),
        experiment_sync_enabled=_env_bool("ADFLOW_EXPERIMENT_SYNC_ENABLED", False),
        codex_executable=os.getenv("CODEX_EXECUTABLE", "codex"),
        codex_workspace=os.getenv("CODEX_WORKSPACE"),
        codex_execution_timeout_seconds=int(os.getenv("CODEX_EXECUTION_TIMEOUT_SECONDS", "1800")),
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
        demand_real_sources_enabled=_env_bool("DEMAND_REAL_SOURCES_ENABLED", True),
        demand_synthetic_fallback=_env_bool("DEMAND_SYNTHETIC_FALLBACK", False),
        demand_max_signals_per_run=int(os.getenv("DEMAND_MAX_SIGNALS_PER_RUN", "5000")),
        demand_max_signals_per_source=int(os.getenv("DEMAND_MAX_SIGNALS_PER_SOURCE", "1000")),
        demand_connector_timeout_seconds=int(os.getenv("DEMAND_CONNECTOR_TIMEOUT_SECONDS", "20")),
        demand_connector_max_retries=int(os.getenv("DEMAND_CONNECTOR_MAX_RETRIES", "2")),
        x_api_bearer_token=os.getenv("X_API_BEARER_TOKEN"),
        reddit_user_agent=os.getenv("REDDIT_USER_AGENT", "adflow-ai-demand-research/1.0"),
        reddit_client_id=os.getenv("REDDIT_CLIENT_ID"),
        reddit_client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
        x_ads_consumer_key=os.getenv("X_ADS_CONSUMER_KEY"),
        x_ads_consumer_secret=os.getenv("X_ADS_CONSUMER_SECRET"),
        x_ads_token_encryption_key=os.getenv("X_ADS_TOKEN_ENCRYPTION_KEY"),
        x_ads_api_base_url=os.getenv("X_ADS_API_BASE_URL", "https://ads-api.x.com/12"),
        x_ads_oauth_base_url=os.getenv("X_ADS_OAUTH_BASE_URL", "https://api.x.com/oauth"),
        x_ads_oauth_callback_url=os.getenv("X_ADS_OAUTH_CALLBACK_URL", "http://127.0.0.1:8000/integrations/x-ads/oauth/callback"),
        frontend_app_url=os.getenv("ADFLOW_FRONTEND_APP_URL", "http://localhost:3000"),
        x_api_base_url=os.getenv("X_API_BASE_URL", "https://api.x.com/2"),
        google_custom_search_api_key=os.getenv("GOOGLE_CUSTOM_SEARCH_API_KEY"),
        google_custom_search_engine_id=os.getenv("GOOGLE_CUSTOM_SEARCH_ENGINE_ID"),
        firecrawl_api_key=os.getenv("FIRECRAWL_API_KEY"),
        firecrawl_search_enabled=_env_bool("FIRECRAWL_SEARCH_ENABLED", True),
        firecrawl_search_max_queries=int(os.getenv("FIRECRAWL_SEARCH_MAX_QUERIES", "4")),
        firecrawl_search_results_per_query=int(os.getenv("FIRECRAWL_SEARCH_RESULTS_PER_QUERY", "10")),
        firecrawl_search_max_results_per_run=int(os.getenv("FIRECRAWL_SEARCH_MAX_RESULTS_PER_RUN", "30")),
        firecrawl_max_urls_per_run=int(os.getenv("FIRECRAWL_MAX_URLS_PER_RUN", "8")),
        firecrawl_max_age_ms=int(os.getenv("FIRECRAWL_MAX_AGE_MS", "172800000")),
        firecrawl_timeout_ms=int(os.getenv("FIRECRAWL_TIMEOUT_MS", "60000")),
        demand_embedding_provider=os.getenv("DEMAND_EMBEDDING_PROVIDER", "deterministic"),
        demand_embedding_model=os.getenv("DEMAND_EMBEDDING_MODEL", "deterministic-hash-embedding.v1"),
        openai_embedding_model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
        auto_top_up_credit_emails=_env_set("ADFLOW_AUTO_TOP_UP_CREDIT_EMAILS"),
        auto_top_up_credit_amount=int(os.getenv("ADFLOW_AUTO_TOP_UP_CREDIT_AMOUNT", "5000")),
        lp_snapshot_cron_secret=os.getenv("ADFLOW_LP_SNAPSHOT_CRON_SECRET"),
        lp_snapshot_user_id=os.getenv("ADFLOW_LP_SNAPSHOT_USER_ID"),
        lp_snapshot_project_id=os.getenv("ADFLOW_LP_SNAPSHOT_PROJECT_ID"),
        lp_snapshot_pair_id=os.getenv("ADFLOW_LP_SNAPSHOT_PAIR_ID"),
        lp_snapshot_query=os.getenv("ADFLOW_LP_SNAPSHOT_QUERY", "demand validation software for solo SaaS founders"),
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
