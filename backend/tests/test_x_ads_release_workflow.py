from __future__ import annotations

import hashlib
import unittest
from datetime import datetime, timedelta, timezone
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
                frontend_app_url="https://app.example.com",
                x_ads_oauth_callback_url="https://api.example.com/integrations/x-ads/oauth/callback",
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

    def test_oauth_start_stores_only_encrypted_request_secret(self) -> None:
        oauth = Mock()
        oauth.request_token.return_value = {
            "oauth_token": "request-token",
            "oauth_token_secret": "request-secret",
            "oauth_callback_confirmed": "true",
        }
        oauth.authorization_url.return_value = "https://api.x.com/oauth/authorize?oauth_token=request-token"
        self.service._oauth_client = Mock(return_value=oauth)  # type: ignore[method-assign]

        result = self.service.start_oauth(user_id="user", label="My X Ads", return_path="/ad-optimization/project")
        session = self.repository.tables["x_ads_oauth_sessions"][0]

        self.assertEqual(result["authorization_url"], oauth.authorization_url.return_value)
        self.assertNotEqual(session["encrypted_request_token_secret"], "request-secret")
        self.assertNotIn("request-token", session.values())
        callback_url = oauth.request_token.call_args.args[0]
        self.assertEqual(callback_url, "https://api.example.com/integrations/x-ads/oauth/callback")

    def test_oauth_callback_denial_does_not_create_connection(self) -> None:
        session = self._oauth_session(expires_at=datetime.now(timezone.utc) + timedelta(minutes=5))
        redirect = self.service.complete_oauth(
            state=session["state"],
            oauth_token=None,
            oauth_verifier=None,
            denied="request-token",
        )
        self.assertIn("x_ads=denied", redirect)
        self.assertEqual(session["status"], "denied")
        self.assertFalse(self.repository.tables.get("x_ads_connections"))

    def test_oauth_callback_rejects_expired_session(self) -> None:
        session = self._oauth_session(expires_at=datetime.now(timezone.utc) - timedelta(seconds=1))
        redirect = self.service.complete_oauth(
            state=session["state"],
            oauth_token="request-token",
            oauth_verifier="verifier",
        )
        self.assertIn("reason=expired", redirect)
        self.assertEqual(session["status"], "expired")

    def test_oauth_callback_exchanges_token_and_connects(self) -> None:
        session = self._oauth_session(expires_at=datetime.now(timezone.utc) + timedelta(minutes=5))
        oauth = Mock()
        oauth.access_token.return_value = {
            "oauth_token": "access-token",
            "oauth_token_secret": "access-secret",
            "user_id": "x-user",
            "screen_name": "adflow",
        }
        self.service._oauth_client = Mock(return_value=oauth)  # type: ignore[method-assign]
        self.service._create_verified_connection = Mock(return_value={"id": "connection"})  # type: ignore[method-assign]

        redirect = self.service.complete_oauth(
            state=session["state"],
            oauth_token="request-token",
            oauth_verifier="verifier",
        )

        self.assertIn("x_ads=connected", redirect)
        self.assertEqual(session["status"], "completed")
        self.service._create_verified_connection.assert_called_once()

    def test_oauth_redirect_preserves_existing_project_query(self) -> None:
        redirect = self.service._frontend_redirect("/ads/new?project_id=project-1", "connected", None)
        self.assertEqual(
            redirect,
            "https://app.example.com/ads/new?project_id=project-1&x_ads=connected",
        )

    def _oauth_session(self, *, expires_at: datetime) -> dict:
        return self.repository.insert(
            "x_ads_oauth_sessions",
            {
                "user_id": "user",
                "state": "state",
                "oauth_token_hash": hashlib.sha256(b"request-token").hexdigest(),
                "encrypted_request_token_secret": self.service.cipher.encrypt("request-secret"),
                "label": "X Ads",
                "return_path": "/ad-optimization/project",
                "status": "pending",
                "expires_at": expires_at.isoformat(),
            },
        )


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

    def get_related_many(self, table: str, *, filters, **kwargs):
        rows = list(self.tables.get(table, []))
        for key, value in filters.items():
            rows = [row for row in rows if row.get(key) == value]
        return rows

    def insert(self, table: str, payload: dict):
        self.sequence += 1
        row = {"id": payload.get("id") or f"id-{self.sequence}", **payload}
        self.tables.setdefault(table, []).append(row)
        return row

    def update(self, table: str, *, user_id: str, filters, payload: dict):
        row = self.get_one(table, user_id=user_id, filters=filters)
        row.update(payload)
        return row
