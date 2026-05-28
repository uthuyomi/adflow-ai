from __future__ import annotations

import os
from typing import Literal

from pydantic import BaseModel, ConfigDict


class Settings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ai_provider: Literal["mock", "openai"] = "mock"
    github_provider: Literal["memory", "github"] = "memory"
    storage_provider: Literal["memory", "supabase"] = "memory"
    openai_model: str | None = None
    github_repository: str | None = None
    github_token: str | None = None
    supabase_url: str | None = None
    supabase_key: str | None = None
    supabase_table: str = "adflow_runs"

    def validate_runtime(self) -> None:
        if self.ai_provider == "openai":
            if not os.getenv("OPENAI_API_KEY"):
                raise ValueError("OPENAI_API_KEY is required when ADFLOW_AI_PROVIDER=openai.")
            if not self.openai_model:
                raise ValueError("OPENAI_MODEL is required when ADFLOW_AI_PROVIDER=openai.")

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
        openai_model=os.getenv("OPENAI_MODEL"),
        github_repository=os.getenv("GITHUB_REPOSITORY"),
        github_token=os.getenv("GITHUB_TOKEN"),
        supabase_url=os.getenv("SUPABASE_URL"),
        supabase_key=(
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or os.getenv("SUPABASE_ANON_KEY")
        ),
        supabase_table=os.getenv("ADFLOW_SUPABASE_TABLE", "adflow_runs"),
    )
