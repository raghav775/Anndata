from tests.conftest import auth_headers


def test_fpo_agent_can_onboard_a_farmer(client, seed_base):
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.post(
        "/api/farmers",
        headers=headers,
        json={
            "full_name": "New Farmer",
            "phone": "9998887777",
            "village": "Niphad",
            "taluka": "Niphad",
            "district": "Nashik",
            "state": "Maharashtra",
            "fpo_id": seed_base["fpo"].id,
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["farmer"]["village"] == "Niphad"
    assert "demo_login_email" in body
    assert body["demo_login_password"]


def test_farmer_cannot_onboard_a_farmer(client, seed_base):
    headers = auth_headers(client, "farmer@test.demo")
    resp = client.post(
        "/api/farmers",
        headers=headers,
        json={
            "full_name": "New Farmer",
            "phone": "9998887777",
            "village": "Niphad",
            "taluka": "Niphad",
            "district": "Nashik",
            "state": "Maharashtra",
            "fpo_id": seed_base["fpo"].id,
        },
    )
    assert resp.status_code == 403


def test_farmer_can_view_own_profile(client, seed_base):
    headers = auth_headers(client, "farmer@test.demo")
    farmer_id = seed_base["farmer"].id
    resp = client.get(f"/api/farmers/{farmer_id}", headers=headers)
    assert resp.status_code == 200


def test_farmer_cannot_view_another_farmers_profile(client, seed_base):
    headers = auth_headers(client, "farmer@test.demo")
    other_farmer_id = seed_base["farmer2"].id
    resp = client.get(f"/api/farmers/{other_farmer_id}", headers=headers)
    assert resp.status_code == 403


def test_fpo_agent_can_view_farmers_in_their_own_fpo(client, seed_base):
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.get(f"/api/farmers/{seed_base['farmer'].id}", headers=headers)
    assert resp.status_code == 200


def test_farmer_can_fetch_own_profile_via_me(client, seed_base):
    headers = auth_headers(client, "farmer@test.demo")
    resp = client.get("/api/farmers/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == seed_base["farmer"].id


def test_non_farmer_cannot_use_me_endpoint(client, seed_base):
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.get("/api/farmers/me", headers=headers)
    assert resp.status_code == 403


def test_onboarding_unknown_fpo_fails(client, seed_base):
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.post(
        "/api/farmers",
        headers=headers,
        json={
            "full_name": "New Farmer",
            "phone": "9998887777",
            "village": "Niphad",
            "taluka": "Niphad",
            "district": "Nashik",
            "state": "Maharashtra",
            "fpo_id": 99999,
        },
    )
    assert resp.status_code == 404
