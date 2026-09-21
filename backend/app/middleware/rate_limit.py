"""A minimal in-memory fixed-window rate limiter.

Not distributed (fine for a single-process demo deployment); the goal is to
demonstrate the control, not to be a production-grade limiter.
"""

import time
from collections import defaultdict

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import get_settings

settings = get_settings()


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self, app, requests_per_minute: int | None = None, enabled: bool | None = None
    ):
        super().__init__(app)
        self.limit = requests_per_minute or settings.rate_limit_per_minute
        # The automated test suite reuses a single app/client instance and
        # can legitimately fire far more than a real client would in a
        # minute, so it's disabled by default under ANNADATA_ENV=test unless
        # a caller (e.g. this middleware's own test) explicitly forces it on.
        self.enabled = (
            enabled if enabled is not None else settings.annadata_env != "test"
        )
        self._hits: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if not self.enabled:
            return await call_next(request)

        client_key = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - 60
        hits = self._hits[client_key]
        while hits and hits[0] < window_start:
            hits.pop(0)

        if len(hits) >= self.limit:
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "RATE_LIMITED",
                        "message": "Too many requests. Please slow down and try again shortly.",
                    }
                },
            )

        hits.append(now)
        return await call_next(request)
