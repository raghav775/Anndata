"""The main app's rate limiter is disabled under ANNADATA_ENV=test (see
conftest.py) so the rest of the suite isn't throttled. This test exercises
the middleware directly, in isolation, against a minimal app so the actual
throttling behavior is still verified."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.rate_limit import RateLimitMiddleware


def _make_app(limit: int) -> FastAPI:
    app = FastAPI()
    app.add_middleware(RateLimitMiddleware, requests_per_minute=limit, enabled=True)

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
