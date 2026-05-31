from __future__ import annotations

from typing import Any

from backend.services.product_review.models import BacklogCandidate, ProductReviewOutput

SYSTEM_INSTRUCTION = """You are a product intelligence analyst for an ad/LP/product improvement tool.

You must analyze evidence, product profile, competitor signals, landing page message, ad copy, and past outcomes.

Do not claim that demand is proven.
Do not claim that the product will succeed.
Do not estimate revenue.
Do not recommend implementing every user request.
Separate:
- ad improvements
- LP/message improvements
- product improvements
- backlog candidates

Product-level changes must be treated as roadmap candidates, not immediate implementation tasks.

Every recommendation must include:
- rationale
- evidence basis
- impact score
- cost score
- confidence score
- risk
- do_not_do when applicable
"""


class ProductReviewAIService:
    def generate(
        self,
        *,
        query: str,
        product_profile: dict[str, Any] | None,
        clusters: list[dict[str, Any]],
        evidence: list[dict[str, Any]],
        outcomes: dict[str, Any] | None = None,
        review_mode: str = "standard",
    ) -> ProductReviewOutput:
        pain_clusters = [item for item in clusters if item.get("cluster_type") in {"pain", "ux_issue", "pricing"}]
        competitor_clusters = [item for item in clusters if item.get("cluster_type") == "competitor"]
        top_pains = [str(item.get("label")) for item in pain_clusters[:5]]
        competitor_gaps = [str(item.get("description") or item.get("label")) for item in competitor_clusters[:4]]
        limit = {"quick": 5, "standard": 10, "deep": 20}.get(review_mode, 10)
        candidates = self._candidates(
            query=query,
            clusters=clusters,
            evidence=evidence,
            limit=limit,
        )
        name = product_profile.get("product_name") if product_profile else "the product"
        return ProductReviewOutput(
            executive_summary=(
                f"{name} has product improvement opportunities around workflow friction, message proof, "
                "and onboarding clarity. This is a backlog-oriented review, not an implementation instruction "
                "or a success verdict."
            ),
            strongest_pain_points=top_pains or ["Evidence is still sparse; collect more real user signals before high-confidence planning."],
            competitor_gaps=competitor_gaps or ["Competitor gaps are directional until external source connectors are added."],
            product_fit_analysis=(
                "The current evidence suggests checking whether the advertised promise can be experienced quickly "
                "inside the product. Treat low-evidence findings as hypotheses."
            ),
            ux_feature_issues=[item for item in top_pains[:3]],
            feature_add_candidates=["Reduce first-value setup steps", "Add proof-oriented onboarding checkpoint"],
            feature_remove_candidates=["Defer broad feature expansion until repeated evidence supports it"],
            onboarding_improvements=["Show one clear first action tied to the LP promise", "Add sample data or guided setup for first-run value"],
            pricing_packaging_suggestions=["Clarify plan limits only if pricing evidence remains a repeated objection"],
            recommended_positioning=["Position around concrete workflow relief rather than generic productivity claims"],
            roadmap_candidates=[candidate.title for candidate in candidates],
            do_not_build=["Do not build every requested feature from sparse evidence", "Do not treat mock evidence as demand proof"],
            backlog_items=candidates,
        )

    @staticmethod
    def _candidates(
        *,
        query: str,
        clusters: list[dict[str, Any]],
        evidence: list[dict[str, Any]],
        limit: int,
    ) -> list[BacklogCandidate]:
        candidates: list[BacklogCandidate] = []
        for cluster in clusters[:limit]:
            count = int(cluster.get("evidence_count") or 0)
            impact = min(92, 55 + count * 7 + float(cluster.get("opportunity_score") or 0) * 0.2)
            cost = 35 if cluster.get("cluster_type") in {"copy", "lp_gap", "ad_angle"} else 55
            confidence = min(88, 35 + count * 8)
            candidates.append(
                BacklogCandidate(
                    title=f"Investigate {cluster.get('label') or query}",
                    description=(
                        f"Review this product opportunity from the {cluster.get('cluster_type')} cluster. "
                        "Keep it as a backlog candidate until a human approves the next step."
                    ),
                    category="ux_improvement" if cluster.get("cluster_type") in {"pain", "ux_issue"} else "copy",
                    impact_score=round(impact, 2),
                    cost_score=cost,
                    confidence_score=confidence,
                    evidence_count=count,
                    target_area=str(cluster.get("cluster_type") or "product"),
                    affected_files_hint=["frontend/app/...", "backend/services/..."],
                    acceptance_criteria=[
                        "The change is scoped from an approved backlog item.",
                        "No success, demand, or revenue claims are introduced.",
                        "Existing ad/LP analysis remains intact.",
                    ],
                    evidence_cluster_ids=[str(cluster.get("id"))] if cluster.get("id") else [],
                    rationale=str(cluster.get("description") or "Cluster-based opportunity."),
                    risk_notes="Evidence may be directional or mock-generated; validate before implementation.",
                    do_not_do="Do not auto-implement this from Product Review alone.",
                ),
            )
        if not candidates:
            candidates.append(
                BacklogCandidate(
                    title=f"Collect more product evidence for {query}",
                    description="Evidence is not yet strong enough for confident roadmap prioritization.",
                    category="analytics",
                    impact_score=50,
                    cost_score=30,
                    confidence_score=35,
                    evidence_count=len(evidence),
                    target_area="evidence",
                    acceptance_criteria=["More manual or real-source evidence is attached before implementation planning."],
                    rationale="Low evidence confidence should lead to more research, not immediate product work.",
                    do_not_do="Do not infer demand from a small sample.",
                ),
            )
        return candidates[:limit]
