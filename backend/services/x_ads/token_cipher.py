from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken


class TokenCipher:
    def __init__(self, key: str | None) -> None:
        if not key:
            raise ValueError("A token encryption key is required for external service connections.")
        try:
            self._fernet = Fernet(key.encode("ascii"))
        except (ValueError, TypeError) as exc:
            raise ValueError("The token encryption key must be a valid Fernet key.") from exc

    def encrypt(self, value: str) -> str:
        if not value:
            raise ValueError("Token values cannot be empty.")
        return self._fernet.encrypt(value.encode("utf-8")).decode("ascii")

    def decrypt(self, value: str) -> str:
        try:
            return self._fernet.decrypt(value.encode("ascii")).decode("utf-8")
        except (InvalidToken, ValueError, TypeError) as exc:
            raise ValueError("Stored external service credentials could not be decrypted.") from exc
