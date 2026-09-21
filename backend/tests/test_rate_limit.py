"""The main app's rate limiter is disabled under ANNADATA_ENV=test (see
conftest.py) so the rest of the suite isn't throttled. This test exercises
the middleware directly, in isolation, against a minimal app so the actual
throttling behavior is still verified."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from app.middleware.rate_limit import RateLimitMiddleware


def _make_app(limit: int, with_cors: bool = False) -> FastAPI:
    app = FastAPI()
    app.add_middleware(RateLimitMiddleware, requests_per_minute=limit, enabled=True)
    if with_cors:
        # CORS must be added AFTER (so it wraps OUTSIDE) the rate limiter —
        # see the ordering comment in app/main.py.
        app.add_middleware(
            CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"]
        )

    @app.get("/ping")
    def ping():
        return {"ok": True}

    return app


def test_requests_within_limit_succeed():
    client = TestClient(_make_app(limit=5))
    for _ in range(5):
        assert client.get("/ping").status_code == 200


def test_requests_beyond_limit_are_rejected():
    client = TestClient(_make_app(limit=3))
    for _ in range(3):
        assert client.get("/ping").status_code == 200
    resp = client.get("/ping")
    assert resp.status_code == 429
    assert resp.json()["error"]["code"] == "RATE_LIMITED"


def test_rate_limited_response_still_carries_cors_headers():
    """Regression test: CORS must wrap OUTSIDE the rate limiter, or a
    429 response arrives at the browser with no Access-Control-Allow-Origin
    header and gets reported as an opaque network error instead of a 429."""
    client = TestClient(_make_app(limit=1, with_cors=True))
    headers = {"Origin": "http://localhost:5173"}
    assert client.get("/ping", headers=headers).status_code == 200

    resp = client.get("/ping", headers=headers)
    assert resp.status_code == 429
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:5173"
