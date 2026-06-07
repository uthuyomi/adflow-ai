from __future__ import annotations

import socket
import unittest
from unittest.mock import patch

from backend.core.url_safety import validate_public_http_url


class PublicUrlSafetyTests(unittest.TestCase):
    def test_rejects_localhost(self) -> None:
        with self.assertRaisesRegex(ValueError, "private"):
            validate_public_http_url("http://localhost/admin")

    def test_rejects_private_dns_result(self) -> None:
        with patch.object(socket, "getaddrinfo", return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.0.0.2", 443))]):
            with self.assertRaisesRegex(ValueError, "private"):
                validate_public_http_url("https://internal.example.com")

    def test_allows_public_dns_result(self) -> None:
        with patch.object(socket, "getaddrinfo", return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))]):
            self.assertEqual(validate_public_http_url("https://example.com/page"), "https://example.com/page")


if __name__ == "__main__":
    unittest.main()
