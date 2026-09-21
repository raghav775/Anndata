from tests.conftest import (
    auth_headers,
    create_lot,
    progress_lot_to_open_for_offers,
    submit_offer,
)


def _open_lot(client, seed_base):
    lot_id = create_lot(client, seed_base)
    progress_lot_to_open_for_offers(client, seed_base, lot_id)
    return lot_id


def test_offer_requires_lot_open_for_offers(client, seed_base):
    lot_id = create_lot(client, seed_base)  # still DRAFT
    headers = auth_headers(client, "buyer@test.demo")
    resp = client.post(
        "/api/offers",
        headers=headers,
        json={
            "lot_id": lot_id,
            "gross_price_per_kg": 30,
            "required_quantity_kg": 100,
            "required_grade": "B",
        },
    )
    assert resp.status_code == 422


def test_unverified_buyer_cannot_submit_offer(client, seed_base):
    lot_id = _open_lot(client, seed_base)
    headers = auth_headers(client, "buyer3@test.demo")  # unverified in seed_base
    resp = client.post(
        "/api/offers",
        headers=headers,
        json={
            "lot_id": lot_id,
            "gross_price_per_kg": 30,
            "required_quantity_kg": 100,
            "required_grade": "B",
        },
    )
    assert resp.status_code == 403


def test_farmer_cannot_submit_offer(client, seed_base):
    lot_id = _open_lot(client, seed_base)
    headers = auth_headers(client, "farmer@test.demo")
    resp = client.post(
        "/api/offers",
        headers=headers,
        json={
            "lot_id": lot_id,
            "gross_price_per_kg": 30,
            "required_quantity_kg": 100,
            "required_grade": "B",
        },
    )
    assert resp.status_code == 403


def test_offer_rejects_non_positive_price(client, seed_base):
    lot_id = _open_lot(client, seed_base)
    headers = auth_headers(client, "buyer@test.demo")
    resp = client.post(
        "/api/offers",
        headers=headers,
        json={
            "lot_id": lot_id,
            "gross_price_per_kg": 0,
            "required_quantity_kg": 100,
            "required_grade": "B",
        },
    )
    assert resp.status_code == 422


def test_offer_comparison_ranks_by_net_not_gross(client, seed_base):
    lot_id = _open_lot(client, seed_base)
    submit_offer(
        client,
        "buyer@test.demo",
        lot_id,
        gross_price_per_kg=30,
        transport_cost_per_kg=4.0,
    )
    submit_offer(
        client,
        "buyer2@test.demo",
        lot_id,
        gross_price_per_kg=29,
        transport_cost_per_kg=1.5,
    )

    headers = auth_headers(client, "fpo@test.demo")
    resp = client.get(f"/api/offers/lot/{lot_id}", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    best = next(o for o in body["offers"] if o["id"] == body["best_offer_id"])
    assert best["gross_price_per_kg"] == 29
    assert best["net_price_per_kg"] == 27.5


def test_fpo_accepting_offer_rejects_the_others(client, seed_base):
    lot_id = _open_lot(client, seed_base)
    offer_a = submit_offer(
        client,
        "buyer@test.demo",
        lot_id,
        gross_price_per_kg=30,
        transport_cost_per_kg=4.0,
    )
    offer_b = submit_offer(
        client,
        "buyer2@test.demo",
        lot_id,
        gross_price_per_kg=29,
        transport_cost_per_kg=1.5,
    )

    headers = auth_headers(client, "fpo@test.demo")
    resp = client.post(f"/api/offers/{offer_b}/accept", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "ACCEPTED"

    comparison = client.get(f"/api/offers/lot/{lot_id}", headers=headers).json()
    statuses = {o["id"]: o["status"] for o in comparison["offers"]}
    assert statuses[offer_a] == "REJECTED"
    assert statuses[offer_b] == "ACCEPTED"

    lot = client.get(f"/api/lots/{lot_id}", headers=headers).json()
    assert lot["status"] == "OFFER_ACCEPTED"


def test_buyer_cannot_accept_their_own_offer(client, seed_base):
    lot_id = _open_lot(client, seed_base)
    offer_id = submit_offer(client, "buyer@test.demo", lot_id, gross_price_per_kg=30)
    headers = auth_headers(client, "buyer@test.demo")
    resp = client.post(f"/api/offers/{offer_id}/accept", headers=headers)
    assert resp.status_code == 403
