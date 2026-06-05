from __future__ import annotations

import time


class SimpleRateLimiter:
    def __init__(self, *, min_interval_seconds: float = 0.0) -> None:
        self.min_interval_seconds = min_interval_seconds
        self._last_call = 0.0

    def wait(self) -> None:
        if self.min_interval_seconds <= 0:
            return
        now = time.monotonic()
        delay = self.min_interval_seconds - (now - self._last_call)
        if delay > 0:
            time.sleep(delay)
        self._last_call = time.monotonic()
