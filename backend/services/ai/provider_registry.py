from __future__ import annotations

from backend.core.config import Settings
from backend.services.ai.providers.base import StructuredAIProvider
from backend.services.ai.providers.gemini_provider import GeminiProvider
from backend.services.ai.providers.grok_provider import GrokProvider
from backend.services.ai.providers.mock_provider import MockProvider
from backend.services.ai.providers.openai_provider import OpenAIProvider


class AIProviderRegistry:
    def __init__(self, settings: Settings) -> None:
        self.providers: dict[str, StructuredAIProvider] = {
            "mock": MockProvider(),
            "grok": GrokProvider(api_key=settings.grok_api_key, model=settings.grok_model),
            "gemini": GeminiProvider(api_key=settings.gemini_api_key, model=settings.gemini_model),
            "openai": OpenAIProvider(
                fast_model=settings.effective_openai_fast_model,
                deep_model=settings.effective_openai_deep_model,
            ),
            "chatgpt": OpenAIProvider(
                fast_model=settings.effective_openai_fast_model,
                deep_model=settings.effective_openai_deep_model,
            ),
            "codex": MockProvider(),
        }

    def get(self, provider_key: str) -> StructuredAIProvider:
        return self.providers.get(provider_key, self.providers["mock"])
