from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from backend.services.ads.ad_collector_service import (
    AdCollectorService,
    FullAdsCollection,
)
from backend.services.ai.ad_improvement_service import (
    AdImprovementResult,
    AdImprovementService,
)
from backend.services.ai.diff_service import DiffResult, DiffService
from backend.services.ai.feature_extractor import AIFeatures, FeatureExtractor
from backend.services.ai.lp_improvement_service import (
    LPImprovementResult,
    LPImprovementService,
)
from backend.services.ai.review_service import ReviewResult, ReviewService
from backend.services.analytics.storage_service import (
    CollectionStorage,
    RawCollectionRecord,
    StorageSaveResult,
)
from backend.services.github.pr_service import (
    PRService,
    PRSummary,
    PullRequestResult,
)
from backend.services.lp.lp_collector import LPCollection, LPCollector


class AdFlowWorkflowInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pr_title: str
    base_branch: str
    head_branch: str
    allowed_paths: list[str] = Field(min_length=1)
    predicted_ctr: float
    predicted_cvr: float


class AdFlowWorkflowResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ads: FullAdsCollection
    lp: LPCollection
    features: AIFeatures
    ad_improvements: AdImprovementResult
    lp_improvements: LPImprovementResult
    diff: DiffResult
    review: ReviewResult
    storage: StorageSaveResult
    pull_request: PullRequestResult | None = None


class AdFlowWorkflowService:
    def __init__(
        self,
        *,
        ad_collector: AdCollectorService,
        lp_collector: LPCollector,
        feature_extractor: FeatureExtractor,
        ad_improvement_service: AdImprovementService,
        lp_improvement_service: LPImprovementService,
        diff_service: DiffService,
        review_service: ReviewService,
        storage: CollectionStorage,
        pr_service: PRService,
    ) -> None:
        self.ad_collector = ad_collector
        self.lp_collector = lp_collector
        self.feature_extractor = feature_extractor
        self.ad_improvement_service = ad_improvement_service
        self.lp_improvement_service = lp_improvement_service
        self.diff_service = diff_service
        self.review_service = review_service
        self.storage = storage
        self.pr_service = pr_service

    def run(self, workflow_input: AdFlowWorkflowInput) -> AdFlowWorkflowResult:
        ads = self.ad_collector.collect()
        lp = self.lp_collector.collect()
        storage = self.storage.save_raw_collection(
            RawCollectionRecord(ads=ads, lp=lp),
        )
        features = self.feature_extractor.extract(ads, lp)
        ad_improvements = self.ad_improvement_service.analyze(features)
        lp_improvements = self.lp_improvement_service.analyze(lp, features)
        diff = self.diff_service.generate(
            ad_improvements=ad_improvements,
            lp_improvements=lp_improvements,
            allowed_paths=workflow_input.allowed_paths,
        )
        review = self.review_service.review(diff)

        pull_request = None
        if review.approved_for_pr:
            pull_request = self.pr_service.create_pr(
                title=workflow_input.pr_title,
                base_branch=workflow_input.base_branch,
                head_branch=workflow_input.head_branch,
                summary=self._build_pr_summary(
                    ad_improvements=ad_improvements,
                    lp_improvements=lp_improvements,
                    diff=diff,
                    predicted_ctr=workflow_input.predicted_ctr,
                    predicted_cvr=workflow_input.predicted_cvr,
                ),
                diff=diff,
                review=review,
            )

        return AdFlowWorkflowResult(
            ads=ads,
            lp=lp,
            features=features,
            ad_improvements=ad_improvements,
            lp_improvements=lp_improvements,
            diff=diff,
            review=review,
            storage=storage,
            pull_request=pull_request,
        )

    @staticmethod
    def _build_pr_summary(
        *,
        ad_improvements: AdImprovementResult,
        lp_improvements: LPImprovementResult,
        diff: DiffResult,
        predicted_ctr: float,
        predicted_cvr: float,
    ) -> PRSummary:
        return PRSummary(
            problems=ad_improvements.problems,
            improvements=[
                *ad_improvements.suggestions,
                *lp_improvements.hero,
                *lp_improvements.cta,
                *lp_improvements.faq,
                *lp_improvements.structure,
                *lp_improvements.mobile_ui,
            ],
            predicted_ctr=predicted_ctr,
            predicted_cvr=predicted_cvr,
            changed_files=[file.path for file in diff.files],
        )
