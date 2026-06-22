from __future__ import annotations

import base64
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import json
from typing import Any

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
import requests

from backend.services.github.github_api_client import GitHubAPIClient


@dataclass(frozen=True)
class InstallationToken:
    token: str
    expires_at: datetime


class GitHubAppAuth:
    def __init__(self, *, app_id: str | None, private_key: str | None, client_id: str | None) -> None:
        self.app_id = (app_id or "").strip()
        self.private_key = (private_key or "").replace("\\n", "\n").strip()
        self.client_id = (client_id or "").strip()

    @property
    def configured(self) -> bool:
        return bool(self.app_id and self.private_key and self.client_id)

    def app_client(self) -> GitHubAPIClient:
        return GitHubAPIClient(self.create_app_jwt())

    def installation_client(self, installation_id: int) -> GitHubAPIClient:
        return GitHubAPIClient(self.create_installation_token(installation_id).token)

    def create_app_jwt(self) -> str:
        if not self.configured:
            raise ValueError("GitHub App is not configured.")
        now = datetime.now(timezone.utc)
        header = {"alg": "RS256", "typ": "JWT"}
        payload = {
            "iat": int((now - timedelta(seconds=60)).timestamp()),
            "exp": int((now + timedelta(minutes=9)).timestamp()),
            "iss": self.app_id,
        }
        signing_input = (
            f"{_base64url(json.dumps(header, separators=(',', ':')).encode())}."
            f"{_base64url(json.dumps(payload, separators=(',', ':')).encode())}"
        )
        key = serialization.load_pem_private_key(self.private_key.encode(), password=None)
        signature = key.sign(signing_input.encode(), padding.PKCS1v15(), hashes.SHA256())
        return f"{signing_input}.{_base64url(signature)}"

    def create_installation_token(self, installation_id: int) -> InstallationToken:
        response = requests.post(
            f"https://api.github.com/app/installations/{installation_id}/access_tokens",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.create_app_jwt()}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            json={"permissions": {"contents": "write", "metadata": "read", "pull_requests": "write"}},
            timeout=30,
        )
        if not response.ok:
            raise ValueError(f"GitHub installation token request failed ({response.status_code}).")
        body = response.json()
        expires_at = datetime.fromisoformat(str(body["expires_at"]).replace("Z", "+00:00"))
        return InstallationToken(token=str(body["token"]), expires_at=expires_at)

    def get_app(self) -> dict[str, Any]:
        return self.app_client().get("/app")

    def get_installation(self, installation_id: int) -> dict[str, Any]:
        return self.app_client().get(f"/app/installations/{installation_id}")

    def delete_installation(self, installation_id: int) -> None:
        self.app_client().delete(f"/app/installations/{installation_id}")


def _base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()
