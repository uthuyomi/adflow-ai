from __future__ import annotations

import base64
import json
import unittest
from unittest.mock import patch

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from backend.services.github.github_app_auth import GitHubAppAuth


class GitHubAppAuthTests(unittest.TestCase):
    def setUp(self) -> None:
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        self.private_key = key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode()

    def test_app_jwt_uses_app_id_and_short_expiry(self):
        auth = GitHubAppAuth(app_id="123", private_key=self.private_key, client_id="client")
        token = auth.create_app_jwt()
        parts = token.split(".")
        payload = json.loads(base64.urlsafe_b64decode(parts[1] + "=="))
        self.assertEqual(payload["iss"], "123")
        self.assertLessEqual(payload["exp"] - payload["iat"], 600)

    @patch("backend.services.github.github_app_auth.requests.post")
    def test_installation_token_is_requested_on_demand(self, post):
        post.return_value.ok = True
        post.return_value.json.return_value = {
            "token": "temporary-token",
            "expires_at": "2026-06-20T01:00:00Z",
        }
        auth = GitHubAppAuth(app_id="123", private_key=self.private_key, client_id="client")
        token = auth.create_installation_token(42)
        self.assertEqual(token.token, "temporary-token")
        self.assertIn("/app/installations/42/access_tokens", post.call_args.args[0])
        self.assertNotIn("temporary-token", str(post.call_args))


if __name__ == "__main__":
    unittest.main()
