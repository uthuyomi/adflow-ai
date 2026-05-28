from __future__ import annotations

import requests

from backend.services.github.pr_service import PullRequestRequest, PullRequestResult


class GitHubPRClient:
    def __init__(self, *, repository: str, token: str) -> None:
        self.repository = repository
        self.token = token

    def create_pull_request(self, request: PullRequestRequest) -> PullRequestResult:
        response = requests.post(
            f"https://api.github.com/repos/{self.repository}/pulls",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            json={
                "title": request.title,
                "body": request.body,
                "base": request.base_branch,
                "head": request.head_branch,
                "maintainer_can_modify": False,
            },
            timeout=30,
        )
        try:
            response.raise_for_status()
        except requests.HTTPError as exc:
            raise ValueError(f"GitHub PR creation failed: {response.text}") from exc
        payload = response.json()
        return PullRequestResult(
            pr_number=payload["number"],
            pr_url=payload["html_url"],
        )
