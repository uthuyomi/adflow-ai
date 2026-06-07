from __future__ import annotations

from typing import Any
from urllib.parse import parse_qs

import requests

from backend.services.x_ads.x_ads_client import build_oauth_header


class XOAuthClient:
    def __init__(
        self,
        *,
        consumer_key: str,
        consumer_secret: str,
        oauth_base_url: str = "https://api.x.com/oauth",
        timeout: int = 30,
    ) -> None:
        if not consumer_key or not consumer_secret:
            raise ValueError("X_ADS_CONSUMER_KEY and X_ADS_CONSUMER_SECRET are required.")
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.oauth_base_url = oauth_base_url.rstrip("/")
        self.timeout = timeout

    def request_token(self, callback_url: str) -> dict[str, str]:
        url = f"{self.oauth_base_url}/request_token"
        return self._post(
            url,
            authorization=build_oauth_header(
                consumer_key=self.consumer_key,
                consumer_secret=self.consumer_secret,
                method="POST",
                url=url,
                callback=callback_url,
            ),
        )

    def access_token(self, *, request_token: str, request_token_secret: str, verifier: str) -> dict[str, str]:
        url = f"{self.oauth_base_url}/access_token"
        return self._post(
            url,
            authorization=build_oauth_header(
                consumer_key=self.consumer_key,
                consumer_secret=self.consumer_secret,
                method="POST",
                url=url,
                token=request_token,
                token_secret=request_token_secret,
                verifier=verifier,
            ),
        )

    def authorization_url(self, request_token: str) -> str:
        return f"{self.oauth_base_url}/authorize?oauth_token={request_token}"

    def _post(self, url: str, *, authorization: str) -> dict[str, str]:
        response = requests.post(url, headers={"Authorization": authorization}, timeout=self.timeout)
        if not response.ok:
            raise ValueError(f"X OAuth request failed ({response.status_code}): {response.text[:300]}")
        parsed: dict[str, Any] = parse_qs(response.text, keep_blank_values=True)
        payload = {key: str(values[0]) for key, values in parsed.items() if values}
        if not payload.get("oauth_token") or not payload.get("oauth_token_secret"):
            raise ValueError("X OAuth response did not include the required token values.")
        return payload
