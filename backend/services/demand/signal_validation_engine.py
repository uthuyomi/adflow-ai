from __future__ import annotations

from collections import Counter
from typing import Any

from backend.services.demand.demand_models import DemandSignalValidation


class SignalValidationEngine:
    def validate(
        self,
        *,
        signals: list[dict[str, Any]],
        clusters: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        validations: list[dict[str, Any]] = []
        for cluster in clusters:
            indexes = [int(index) for index in cluster.get("evidence_signal_indexes", [])]
            evidence = [signals[index] for index in indexes if 0 <= index < len(signals)]
            source_types = [str(signal.get("source_type") or "unknown") for signal in evidence]
            source_diversity = len(set(source_types))
            duplicate_ratio = _duplicate_ratio([
                str((signal.get("metadata") or {}).get("normalized_text") or signal.get("body") or "")
                for signal in evidence
            ])
            noise_ratio = _average([
                float(signal.get("noise_score") or (signal.get("metadata") or {}).get("noise_score") or 0)
                for signal in evidence
            ])
            spam_ratio = _average([
                float(signal.get("spam_score") or (signal.get("metadata") or {}).get("spam_score") or 0)
                for signal in evidence
            ])
            recency_score = min(15, len(evidence) * 2.5)
            continuity_score = min(15, source_diversity * 3)
            volume_score = min(len(evidence) / 500, 1) * 20
            source_score = min(source_diversity / 5, 1) * 25
            quality_score = (1 - noise_ratio) * 15
            validation_score = max(
                0,
                min(
                    100,
                    source_score
                    + volume_score
                    + recency_score
                    + continuity_score
                    + quality_score
                    - duplicate_ratio * 15
                    - spam_ratio * 20,
                ),
            )

            warnings = []
            if source_diversity <= 1:
                warnings.append("単一媒体に偏っているため、根拠の幅が限定的です")
            if noise_ratio >= 0.45:
                warnings.append("短文または文脈不足のシグナルが多く、信頼度は控えめです")
            if duplicate_ratio >= 0.35:
                warnings.append("同一文脈の重複が多い可能性があります")

            validation = DemandSignalValidation(
                validation_score=round(validation_score, 2),
                confidence=round(min(0.95, 0.35 + validation_score / 140), 3),
                cross_source_confirmed=source_diversity >= 2,
                source_diversity=source_diversity,
                duplicate_ratio=round(duplicate_ratio, 3),
                noise_ratio=round(noise_ratio, 3),
                spam_ratio=round(spam_ratio, 3),
                recency_score=round(recency_score, 2),
                continuity_score=round(continuity_score, 2),
                bias_warnings=warnings,
                validation_reasons=[
                    f"{source_diversity}種類のソースで確認",
                    f"{len(evidence)}件の根拠シグナル",
                    "需要断定ではなく信頼度評価として扱う",
                ],
            )
            validations.append({
                "cluster_id": cluster.get("db_id"),
                "cluster_key": cluster.get("id"),
                "cluster_name": cluster.get("name"),
                **validation.model_dump(mode="json"),
            })

        summary = {
            "average_validation_score": round(_average([item["validation_score"] for item in validations]), 2),
            "strong_validated_clusters": [item for item in validations if item["validation_score"] >= 80],
            "weak_or_noisy_clusters": [
                item for item in validations if item["validation_score"] < 50 or item["noise_ratio"] >= 0.45
            ],
            "cross_source_confirmed_count": sum(1 for item in validations if item["cross_source_confirmed"]),
        }
        return validations, summary


def _duplicate_ratio(values: list[str]) -> float:
    if not values:
        return 0
    counts = Counter(values)
    duplicate_count = sum(count - 1 for count in counts.values() if count > 1)
    return duplicate_count / len(values)


def _average(values: list[float]) -> float:
    cleaned = [value for value in values if isinstance(value, (int, float))]
    return sum(cleaned) / len(cleaned) if cleaned else 0
