from tests.conftest import TEST_PASSWORD, auth_headers


def test_valid_login_returns_tokens(client, seed_base):
    resp = client.post(
        "/api/auth/login", json={"email": "farmer@test.demo", "password": TEST_PASSWORD}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


def test_invalid_password_is_rejected(client, seed_base):
    resp = client.post(
        "/api/auth/login",
        json={"email": "farmer@test.demo", "password": "wrong-password"},
    )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"


def test_unknown_email_is_rejected(client, seed_base):
    resp = client.post(
        "/api/auth/login", json={"email": "nobody@test.demo", "password": TEST_PASSWORD}
    )
    assert resp.status_code == 401


def test_me_requires_a_token(client, seed_base):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_returns_current_user(client, seed_base):
    headers = auth_headers(client, "farmer@test.demo")
    resp = client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "farmer@test.demo"
    assert resp.json()["role"] == "FARMER"


def test_refresh_token_issues_new_access_token(client, seed_base):
    login = client.post(
        "/api/auth/login", json={"email": "farmer@test.demo", "password": TEST_PASSWORD}
    )
    refresh_token = login.json()["refresh_token"]
    resp = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_access_token_cannot_be_used_as_refresh_token(client, seed_base):
    login = client.post(
        "/api/auth/login", json={"email": "farmer@test.demo", "password": TEST_PASSWORD}
    )
    access_token = login.json()["access_token"]
    resp = client.post("/api/auth/refresh", json={"refresh_token": access_token})
    assert resp.status_code == 401


def test_malformed_bearer_token_is_rejected(client, seed_base):
    resp = client.get(
        "/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert resp.status_code == 401


def test_role_restricted_endpoint_blocks_wrong_role(client, seed_base):
    headers = auth_headers(client, "farmer@test.demo")
    resp = client.get("/api/audit-logs", headers=headers)
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


def test_role_restricted_endpoint_allows_correct_role(client, seed_base):
    headers = auth_headers(client, "admin@test.demo")
    resp = client.get("/api/audit-logs", headers=headers)
    assert resp.status_code == 200
