from __future__ import annotations

import hashlib
import re

from backend.services.evidence.models import EvidenceNormalizeResult, EvidenceSourceCreate

URL_RE = re.compile(r"https?://\S+")
SPACE_RE = re.compile(r"\s+")


class EvidenceNormalizer:
    def normalize(self, sources: list[EvidenceSourceCreate], *, query: str) -> EvidenceNormalizeResult:
        seen: set[str] = set()
        normalized: list[EvidenceSourceCreate] = []
        skipped = 0
        query_terms = {term.lower() for term in re.split(r"\W+", query) if len(term) >= 3}
        for source in sources:
            content = SPACE_RE.sub(" ", URL_RE.sub("", source.raw_content)).strip()
            if len(content) < 12:
                skipped += 1
                continue
            content_hash = hashlib.sha256(content.lower().encode("utf-8")).hexdigest()
            if content_hash in seen:
                skipped += 1
                continue
            seen.add(content_hash)
            lower = content.lower()
            terms = {term for term in re.split(r"\W+", lower) if len(term) >= 3}
            overlap = len(query_terms & terms)
            relevance = min(100.0, 55.0 + overlap * 8.0 + (10.0 if query.lower() in lower else 0.0))
            normalized.append(
                source.model_copy(
                    update={
                        "normalized_content": content,
                        "content_hash": content_hash,
                        "sentiment": source.sentiment or self._sentiment(content),
                        "relevance_score": source.relevance_score or relevance,
                        "credibility_score": source.credibility_score or self._credibility(source.source_type),
                        "spam_score": source.spam_score if source.spam_score is not None else self._spam_score(content),
                    },
                ),
            )
        return EvidenceNormalizeResult(sources=normalized, skipped_count=skipped)

    @staticmethod
    def _sentiment(content: str) -> str:
        negative = ("困る", "不満", "できない", "高い", "遅い", "面倒", "friction", "hard", "expensive")
        positive = ("便利", "助かる", "良い", "速い", "easy", "useful", "clear")
        if any(word in content for word in negative):
            return "negative"
        if any(word in content for word in positive):
            return "positive"
        return "neutral"

    @staticmethod
    def _credibility(source_type: str) -> float:
        return {
            "review": 78,
            "competitor": 72,
            "search": 68,
            "reddit": 62,
            "twitter": 55,
            "manual": 60,
            "mock": 35,
        }.get(source_type, 50)

    @staticmethod
    def _spam_score(content: str) -> float:
        if content.count("!") > 5 or len(set(content.lower().split())) < 5:
            return 60
        return 10
