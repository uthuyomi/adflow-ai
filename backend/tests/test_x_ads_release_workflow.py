from __future__ import annotations

import unittest
from unittest.mock import Mock

from cryptography.fernet import Fernet

from backend.core.config import Settings
from backend.services.x_ads.token_cipher import TokenCipher
from backend.services.x_ads.x_ads_service import XAdsService


class XAdsReleaseWorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = _Repository()
        self.service = XAdsService(
            repository=self.repository,  # type: ignore[arg-type]
            settings=Settings(
                x_ads_consumer_key="consumer",
                x_ads_consumer_secret="consumer-secret",
                x_ads_token_encryption_key=Fernet.generate_key().decode("ascii"),
            ),
        )

    def test_token_cipher_never_returns_plaintext(self) -> None:
        cipher = TokenCipher(Fernet.generate_key().decode("ascii"))
        encrypted = cipher.encrypt("secret-token")
        self.assertNotEqual(encrypted, "secret-token")
        self.assertEqual(cipher.decrypt(encrypted), "secret-token")

    def test_publish_request_requires_apply_ready(self) -> None:
        self.repository.tables["ai_agent_results"] = [{"id": "result", "user_id": "user", "decision_status": "accepted", "ad_lp_pair_id": "pair", "project_id": "project"}]
        with self.assertRaisesRegex(ValueError, "apply_ready"):
            self.service.create_publish_request(
                user_id="user",
                source_ai_result_id="result",
                connection_id="connection",
                account_id="account",
                line_item_id="line",
                proposed_text="Approved copy",
            )

    def test_publish_requires_separate_approval(self) -> None:
        self.repository.tables["x_ads_publish_requests"] = [{"id": "request", "user_id": "user", "approval_status": "draft", "publish_status": "not_started"}]
        with self.assertRaisesRegex(ValueError, "Explicit approval"):
            self.service.publish(user_id="user", request_id="request")

    def test_published_request_is_idempotent(self) -> None:
        published = {"id": "request", "user_id": "user", "approval_status": "approved", "publish_status": "published", "published_tweet_id": "tweet"}
        self.repository.tables["x_ads_publish_requests"] = [published]
        self.service._connection_client = Mock(side_effect=AssertionError("X API must not be called"))  # type: ignore[method-assign]
        self.assertEqual(self.service.publish(user_id="user", request_id="request"), published)

    def test_create_publish_request_reuses_same_idempotency_key(self) -> None:
        self.repository.tables["ai_agent_results"] = [{
            "id": "result", "user_id": "user", "decision_status": "apply_ready", "ad_lp_pair_id": "pair", "project_id": "project", "output": {"recommendations": ["Approved copy"]},
        }]
        self.repository.tables["ad_lp_pairs"] = [{"id": "pair", "user_id": "user", "twitter_ad_id": "ad"}]
        self.repository.tables["twitter_ads"] = [{"id": "ad", "user_id": "user", "destination_url": "https://example.com"}]
        self.repository.tables["x_ads_connections"] = [{"id": "connection", "user_id": "user", "status": "active"}]
        self.repository.tables["x_ads_accounts"] = [{"id": "account-row", "user_id": "user", "connection_id": "connection", "x_account_id": "account"}]
        first = self.service.create_publish_request(user_id="user", source_ai_result_id="result", connection_id="connection", account_id="account", line_item_id="line")
        second = self.service.create_publish_request(user_id="user", source_ai_result_id="result", connection_id="connection", account_id="account", line_item_id="line")
        self.assertEqual(first["id"], second["id"])


class _Repository:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict]] = {}
        self.sequence = 0

    def get_many(self, table: str, *, user_id: str, filters=None, **kwargs):
        rows = [row for row in self.tables.get(table, []) if row.get("user_id") == user_id]
        for key, value in (filters or {}).items():
            rows = [row for row in rows if row.get(key) == value]
        return rows

    def get_one(self, table: str, *, user_id: str, filters, **kwargs):
        rows = self.get_many(table, user_id=user_id, filters=filters)
        if not rows:
            raise ValueError(f"{table} record was not found.")
        return rows[0]

    def insert(self, table: str, payload: dict):
        self.sequence += 1
        row = {"id": payload.get("id") or f"id-{self.sequence}", **payload}
        self.tables.setdefault(table, []).append(row)
        return row

    def update(self, table: str, *, user_id: str, filters, payload: dict):
        row = self.get_one(table, user_id=user_id, filters=filters)
        row.update(payload)
        return row
