from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time
from typing import Any
from urllib.parse import quote, urlparse

import requests


class XAdsClient:
    def __init__(
        self,
        *,
        consumer_key: str,
        consumer_secret: str,
        access_token: str,
        access_token_secret: str,
        ads_base_url: str = "https://ads-api.x.com/12",
        timeout: int = 30,
    ) -> None:
        if not all((consumer_key, consumer_secret, access_token, access_token_secret)):
            raise ValueError("X Ads OAuth 1.0a credentials are required.")
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.access_token = access_token
        self.access_token_secret = access_token_secret
        self.ads_base_url = ads_base_url.rstrip("/")
        self.timeout = timeout

    def list_accounts(self) -> list[dict[str, Any]]:
        return self._paged("/accounts", {"count": 200})

    def get_account(self, account_id: str) -> dict[str, Any]:
        rows = self._data(self.request("GET", f"/accounts/{account_id}"))
        return rows[0] if rows else {}

    def list_promotable_users(self, account_id: str) -> list[dict[str, Any]]:
        return self._data(self.request("GET", f"/accounts/{account_id}/promotable_users"))

    def list_promoted_tweets(self, account_id: str) -> list[dict[str, Any]]:
        return self._paged(f"/accounts/{account_id}/promoted_tweets", {"count": 1000})

    def list_tweets(self, account_id: str, tweet_ids: list[str]) -> list[dict[str, Any]]:
        if not tweet_ids:
            return []
        rows = []
        for chunk in _chunks(tweet_ids, 100):
            rows.extend(self._data(self.request("GET", f"/accounts/{account_id}/tweets", params={"tweet_ids": ",".join(chunk), "count": 100})))
        return rows

    def get_promoted_tweet_stats(
        self,
        account_id: str,
        promoted_tweet_ids: list[str],
        *,
        start_time: str,
        end_time: str,
        granularity: str = "DAY",
    ) -> list[dict[str, Any]]:
        if not promoted_tweet_ids:
            return []
        rows = []
        for chunk in _chunks(promoted_tweet_ids, 20):
            rows.extend(
                self._data(
                    self.request(
                        "GET",
                        f"/stats/accounts/{account_id}",
                        params={
                            "entity": "PROMOTED_TWEET",
                            "entity_ids": ",".join(chunk),
                            "start_time": start_time,
                            "end_time": end_time,
                            "granularity": granularity,
                            "metric_groups": "ENGAGEMENT,BILLING,VIDEO,WEB_CONVERSION",
                            "placement": "ALL_ON_TWITTER",
                        },
                    ),
                ),
            )
        return rows

    def create_promoted_only_tweet(self, account_id: str, *, text: str) -> dict[str, Any]:
        rows = self._data(
            self.request(
                "POST",
                f"/accounts/{account_id}/tweet",
                data={"text": text, "nullcast": "true"},
            ),
        )
        if not rows:
            raise ValueError("X Ads did not return the created promoted-only post.")
        return rows[0]

    def attach_promoted_tweet(self, account_id: str, *, line_item_id: str, tweet_id: str) -> dict[str, Any]:
        rows = self._data(
            self.request(
                "POST",
                f"/accounts/{account_id}/promoted_tweets",
                data={"line_item_id": line_item_id, "tweet_ids": tweet_id},
            ),
        )
        if not rows:
            raise ValueError("X Ads did not return the promoted post attachment.")
        return rows[0]

    def request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = f"{self.ads_base_url}/{path.lstrip('/')}"
        query = {key: str(value) for key, value in (params or {}).items() if value is not None}
        body = {key: str(value) for key, value in (data or {}).items() if value is not None}
        headers = {"Authorization": self._oauth_header(method, url, {**query, **body})}
        response = requests.request(method, url, params=query or None, data=body or None, headers=headers, timeout=self.timeout)
        if not response.ok:
            raise ValueError(f"X Ads API {method} {urlparse(url).path} failed ({response.status_code}): {response.text[:500]}")
        payload = response.json()
        if isinstance(payload, dict) and payload.get("errors"):
            raise ValueError(f"X Ads API returned errors: {payload['errors']}")
        return payload if isinstance(payload, dict) else {"data": payload}

    def _oauth_header(self, method: str, url: str, request_params: dict[str, str]) -> str:
        return build_oauth_header(
            consumer_key=self.consumer_key,
            consumer_secret=self.consumer_secret,
            method=method,
            url=url,
            request_params=request_params,
            token=self.access_token,
            token_secret=self.access_token_secret,
        )

    def _paged(self, path: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        cursor: str | None = None
        for _ in range(20):
            payload = self.request("GET", path, params={**params, **({"cursor": cursor} if cursor else {})})
            rows.extend(self._data(payload))
            next_cursor = payload.get("next_cursor")
            cursor = str(next_cursor) if next_cursor not in {None, "", "0", 0} else None
            if not cursor:
                break
        return rows

    @staticmethod
    def _data(payload: dict[str, Any]) -> list[dict[str, Any]]:
        data = payload.get("data")
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
        if isinstance(data, dict):
            return [data]
        return []


def _encode(value: Any) -> str:
    return quote(str(value), safe="~-._")


def build_oauth_header(
    *,
    consumer_key: str,
    consumer_secret: str,
    method: str,
    url: str,
    request_params: dict[str, str] | None = None,
    token: str | None = None,
    token_secret: str | None = None,
    callback: str | None = None,
    verifier: str | None = None,
) -> str:
    oauth = {
        "oauth_consumer_key": consumer_key,
        "oauth_nonce": secrets.token_hex(16),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_version": "1.0",
    }
    if token:
        oauth["oauth_token"] = token
    if callback:
        oauth["oauth_callback"] = callback
    if verifier:
        oauth["oauth_verifier"] = verifier
    signature_params = {**(request_params or {}), **oauth}
    parameter_string = "&".join(
        f"{_encode(key)}={_encode(value)}"
        for key, value in sorted(signature_params.items(), key=lambda item: (_encode(item[0]), _encode(item[1])))
    )
    base_string = "&".join((_encode(method.upper()), _encode(url), _encode(parameter_string)))
    signing_key = f"{_encode(consumer_secret)}&{_encode(token_secret or '')}"
    digest = hmac.new(signing_key.encode("ascii"), base_string.encode("ascii"), hashlib.sha1).digest()
    oauth["oauth_signature"] = base64.b64encode(digest).decode("ascii")
    return "OAuth " + ", ".join(f'{_encode(key)}="{_encode(value)}"' for key, value in sorted(oauth.items()))


def _chunks(values: list[str], size: int) -> list[list[str]]:
    return [values[index:index + size] for index in range(0, len(values), size)]
