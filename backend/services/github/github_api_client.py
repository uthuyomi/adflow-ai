from __future__ import annotations

import base64
from typing import Any

import requests


class GitHubAPIClient:
    def __init__(self, token: str) -> None:
        self.headers = {"Accept": "application/vnd.github+json", "Authorization": f"Bearer {token}", "X-GitHub-Api-Version": "2022-11-28"}

    def get(self, path: str) -> Any:
        return self._request("GET", path)

    def post(self, path: str, payload: dict[str, Any]) -> Any:
        return self._request("POST", path, payload)

    def patch(self, path: str, payload: dict[str, Any]) -> Any:
        return self._request("PATCH", path, payload)

    def put(self, path: str, payload: dict[str, Any]) -> Any:
        return self._request("PUT", path, payload)

    def delete(self, path: str) -> Any:
        return self._request("DELETE", path)

    def list_repositories(self) -> list[dict[str, Any]]:
        response = self.get("/installation/repositories?per_page=100")
        return list(response.get("repositories") or [])

    def create_blob(self, repository: str, content: str) -> str:
        return self.post(f"/repos/{repository}/git/blobs", {"content": base64.b64encode(content.encode()).decode(), "encoding": "base64"})["sha"]

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
        response = requests.request(method, f"https://api.github.com{path}", headers=self.headers, json=payload, timeout=30)
        if not response.ok:
            message = response.text[:500]
            if response.status_code == 403 and "rate limit" in message.lower():
                raise ValueError(f"GitHub rate limit exceeded: {message}")
            raise ValueError(f"GitHub API {method} {path} failed ({response.status_code}): {message}")
        return response.json() if response.content else {}
