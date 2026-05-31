from __future__ import annotations

import hashlib
import math
import os
import re

from backend.core.config import Settings


class EvidenceEmbeddingService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings

    @property
    def provider(self) -> str:
        if self.settings and self.settings.evidence_embedding_provider == "openai" and os.getenv("OPENAI_API_KEY"):
            return "openai"
        return "fallback"

    @property
    def model(self) -> str | None:
        if self.provider == "openai" and self.settings:
            return self.settings.openai_embedding_model
        return "deterministic-hash-64"

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if self.provider == "openai":
            try:
                from openai import OpenAI

                client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                response = client.embeddings.create(
                    model=self.settings.openai_embedding_model if self.settings else "text-embedding-3-small",
                    input=texts,
                )
                return [list(item.embedding) for item in response.data]
            except Exception:
                return [self._fallback(text) for text in texts]
        return [self._fallback(text) for text in texts]

    @staticmethod
    def _fallback(text: str, dimensions: int = 64) -> list[float]:
        vector = [0.0] * dimensions
        tokens = [token for token in re.split(r"\W+", text.lower()) if token]
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:2], "big") % dimensions
            vector[index] += 1.0
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        return [round(value / norm, 6) for value in vector]
