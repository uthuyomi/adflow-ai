from __future__ import annotations

from typing import Protocol

from pydantic import BaseModel, ConfigDict, Field

from backend.services.ai.diff_service import DiffResult
from backend.services.ai.review_service import ReviewResult


class PRSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    problems: list[str] = Field(min_length=1)
    improvements: list[str] = Field(min_length=1)
    predicted_ctr: float
    predicted_cvr: float
    changed_files: list[str] = Field(min_length=1)


class PullRequestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    body: str
    base_branch: str
    head_branch: str


class PullRequestResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pr_number: int
    pr_url: str


class GitHubPullRequestClient(Protocol):
    def create_pull_request(self, request: PullRequestRequest) -> PullRequestResult:
        ...


class PRService:
    def __init__(self, github_client: GitHubPullRequestClient) -> None:
        self.github_client = github_client

    def create_pr(
        self,
        *,
        title: str,
        base_branch: str,
        head_branch: str,
        summary: PRSummary,
        diff: DiffResult,
        review: ReviewResult,
    ) -> PullRequestResult:
        if not review.approved_for_pr:
            raise ValueError("Review did not approve this diff for PR creation.")

        changed_files = [file.path for file in diff.files]
        if sorted(changed_files) != sorted(summary.changed_files):
            raise ValueError("Summary changed_files does not match diff files.")

        request = PullRequestRequest(
            title=title,
            body=self._build_body(summary, review),
            base_branch=base_branch,
            head_branch=head_branch,
        )
        return self.github_client.create_pull_request(request)

    @staticmethod
    def _build_body(summary: PRSummary, review: ReviewResult) -> str:
        return "\n".join(
            [
                "## Problems",
                _bullet_list(summary.problems),
                "",
                "## Improvements",
                _bullet_list(summary.improvements),
                "",
                "## Predicted CTR",
                f"{summary.predicted_ctr}",
                "",
                "## Predicted CVR",
                f"{summary.predicted_cvr}",
                "",
                "## Changed Files",
                _bullet_list(summary.changed_files),
                "",
                "## Review",
                f"approved_for_pr: {review.approved_for_pr}",
            ],
        )


def _bullet_list(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items)
