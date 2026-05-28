from __future__ import annotations

from backend.services.github.pr_service import PullRequestRequest, PullRequestResult


class InMemoryPullRequestClient:
    def create_pull_request(self, request: PullRequestRequest) -> PullRequestResult:
        return PullRequestResult(
            pr_number=1,
            pr_url=f"https://github.example/local-preview/{request.head_branch}",
        )
