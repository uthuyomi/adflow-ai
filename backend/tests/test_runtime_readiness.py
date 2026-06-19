from __future__ import annotations

import pytest

from backend.core.config import Settings


def test_production_rejects_non_persistent_or_synthetic_runtime() -> None:
    with pytest.raises(ValueError, match="ADFLOW_STORAGE_PROVIDER=supabase"):
        Settings(
            deployment_environment="production",
            ai_provider="openai",
            openai_model="gpt-test",
            storage_provider="memory",
        ).validate_runtime()

    with pytest.raises(ValueError, match="DEMAND_SYNTHETIC_FALLBACK=false"):
        Settings(
            deployment_environment="production",
            ai_provider="openai",
            openai_model="gpt-test",
            storage_provider="supabase",
            supabase_url="https://example.supabase.co",
            supabase_key="service-role",
            demand_synthetic_fallback=True,
        ).validate_runtime()


def test_production_accepts_real_persistent_runtime(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    Settings(
        deployment_environment="production",
        ai_provider="openai",
        openai_model="gpt-test",
        storage_provider="supabase",
        supabase_url="https://example.supabase.co",
        supabase_key="service-role",
        demand_synthetic_fallback=False,
    ).validate_runtime()
