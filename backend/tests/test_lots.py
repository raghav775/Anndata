from tests.conftest import auth_headers, create_lot, progress_lot_to_open_for_offers


def test_create_lot_aggregates_contributor_quantities(client, seed_base):
    lot_id = create_lot(client, seed_base, quantities=(420, 680))
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.get(f"/api/lots/{lot_id}", headers=headers)
    body = resp.json()
    assert body["total_quantity_kg"] == 1100
    assert len(body["contributors"]) == 2
    assert body["status"] == "DRAFT"


def test_create_lot_rejects_duplicate_contributor(client, seed_base):
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.post(
        "/api/lots",
        headers=headers,
        json={
            "commodity_id": seed_base["commodity"].id,
            "fpo_id": seed_base["fpo"].id,
            "village_origin": "Niphad",
            "collection_point": "Niphad Collection Centre",
            "contributors": [
                {"farmer_id": seed_base["farmer"].id, "quantity_kg": 100},
                {"farmer_id": seed_base["farmer"].id, "quantity_kg": 200},
            ],
        },
    )
    assert resp.status_code == 422


def test_create_lot_rejects_zero_quantity(client, seed_base):
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.post(
        "/api/lots",
        headers=headers,
        json={
            "commodity_id": seed_base["commodity"].id,
            "fpo_id": seed_base["fpo"].id,
            "village_origin": "Niphad",
            "collection_point": "Niphad Collection Centre",
            "contributors": [{"farmer_id": seed_base["farmer"].id, "quantity_kg": 0}],
        },
    )
    assert resp.status_code == 422


def test_create_lot_rejects_negative_quantity(client, seed_base):
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.post(
        "/api/lots",
        headers=headers,
        json={
            "commodity_id": seed_base["commodity"].id,
            "fpo_id": seed_base["fpo"].id,
            "village_origin": "Niphad",
            "collection_point": "Niphad Collection Centre",
            "contributors": [{"farmer_id": seed_base["farmer"].id, "quantity_kg": -50}],
        },
    )
    assert resp.status_code == 422


def test_create_lot_rejects_empty_contributor_list(client, seed_base):
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.post(
        "/api/lots",
        headers=headers,
        json={
            "commodity_id": seed_base["commodity"].id,
            "fpo_id": seed_base["fpo"].id,
            "village_origin": "Niphad",
            "collection_point": "Niphad Collection Centre",
            "contributors": [],
        },
    )
    assert resp.status_code == 422


def test_decimal_quantities_are_accepted_and_summed_precisely(client, seed_base):
    lot_id = create_lot(client, seed_base, quantities=(420.5, 679.5))
    headers = auth_headers(client, "fpo@test.demo")
    body = client.get(f"/api/lots/{lot_id}", headers=headers).json()
    assert body["total_quantity_kg"] == 1100.0


def test_invalid_state_transition_is_rejected(client, seed_base):
    lot_id = create_lot(client, seed_base)
    headers = auth_headers(client, "fpo@test.demo")
    # Lot is DRAFT; opening for offers requires COLLECTED -> ... -> ASSESSED first.
    resp = client.post(f"/api/lots/{lot_id}/open-for-offers", headers=headers)
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "INVALID_STATE_TRANSITION"


def test_cannot_collect_a_lot_twice(client, seed_base):
    lot_id = create_lot(client, seed_base)
    headers = auth_headers(client, "fpo@test.demo")
    assert (
        client.post(f"/api/lots/{lot_id}/collect", headers=headers).status_code == 200
    )
    resp = client.post(f"/api/lots/{lot_id}/collect", headers=headers)
    assert resp.status_code == 409


def test_full_lot_progression_to_open_for_offers(client, seed_base):
    lot_id = create_lot(client, seed_base)
    progress_lot_to_open_for_offers(client, seed_base, lot_id)
    headers = auth_headers(client, "fpo@test.demo")
    body = client.get(f"/api/lots/{lot_id}", headers=headers).json()
    assert body["status"] == "OPEN_FOR_OFFERS"
    assert body["final_grade"] == "B"


def test_farmer_only_sees_lots_they_contributed_to(client, seed_base):
    lot_id = create_lot(client, seed_base, quantities=(420,))
    headers = auth_headers(client, "farmer2@test.demo")
    resp = client.get("/api/lots", headers=headers)
    lot_ids = [lot["id"] for lot in resp.json()]
    assert lot_id not in lot_ids


def test_buyer_cannot_see_a_draft_lot(client, seed_base):
    lot_id = create_lot(client, seed_base)
    headers = auth_headers(client, "buyer@test.demo")
    resp = client.get(f"/api/lots/{lot_id}", headers=headers)
    assert resp.status_code == 403
