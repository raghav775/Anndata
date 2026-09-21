from tests.conftest import (
    accept_offer_and_create_po,
    auth_headers,
    create_lot,
    progress_lot_to_open_for_offers,
    submit_offer,
)


def _delivered_lot_with_po(client, seed_base):
    lot_id = create_lot(client, seed_base)
    progress_lot_to_open_for_offers(client, seed_base, lot_id)
    offer_id = submit_offer(
        client,
        "buyer@test.demo",
        lot_id,
        gross_price_per_kg=29,
        transport_cost_per_kg=1.5,
    )
    po = accept_offer_and_create_po(client, offer_id)
    return lot_id, po


def test_dispute_requires_a_reason(client, seed_base):
    lot_id, po = _delivered_lot_with_po(client, seed_base)
    headers = auth_headers(client, "buyer@test.demo")
    resp = client.post("/api/disputes", headers=headers, json={"lot_id": lot_id})
    assert resp.status_code == 422


def test_opening_a_dispute_moves_lot_to_disputed_and_remembers_prior_state(
    client, seed_base
):
    lot_id, po = _delivered_lot_with_po(client, seed_base)
    fpo_headers = auth_headers(client, "fpo@test.demo")
    buyer_headers = auth_headers(client, "buyer@test.demo")

    lot_before = client.get(f"/api/lots/{lot_id}", headers=fpo_headers).json()
    assert lot_before["status"] == "PURCHASE_ORDER_CREATED"

    resp = client.post(
        "/api/disputes",
        headers=buyer_headers,
        json={
            "lot_id": lot_id,
            "purchase_order_id": po["id"],
            "reason": "Quality below contracted grade on delivery",
        },
    )
    assert resp.status_code == 200
    dispute = resp.json()
    assert dispute["status"] == "OPEN"

    lot_after = client.get(f"/api/lots/{lot_id}", headers=fpo_headers).json()
    assert lot_after["status"] == "DISPUTED"


def test_dispute_requires_evidence_before_closing_is_still_possible_to_add(
    client, seed_base
):
    lot_id, po = _delivered_lot_with_po(client, seed_base)
    buyer_headers = auth_headers(client, "buyer@test.demo")
    dispute = client.post(
        "/api/disputes",
        headers=buyer_headers,
        json={
            "lot_id": lot_id,
            "purchase_order_id": po["id"],
            "reason": "Sprouting observed on delivery",
        },
    ).json()

    resp = client.post(
        f"/api/disputes/{dispute['id']}/evidence",
        headers=buyer_headers,
        data={
            "evidence_type": "NOTE",
            "description": "Photos taken at delivery dock, sprouting visible",
        },
    )
    assert resp.status_code == 200
    assert len(resp.json()["evidence"]) == 1


def test_invalid_dispute_status_transition_is_rejected(client, seed_base):
    lot_id, po = _delivered_lot_with_po(client, seed_base)
    buyer_headers = auth_headers(client, "buyer@test.demo")
    fpo_headers = auth_headers(client, "fpo@test.demo")
    dispute = client.post(
        "/api/disputes",
        headers=buyer_headers,
        json={
            "lot_id": lot_id,
            "purchase_order_id": po["id"],
            "reason": "Quality issue",
        },
    ).json()

    # OPEN -> RESOLVED directly is not an allowed transition via the status endpoint
    resp = client.patch(
        f"/api/disputes/{dispute['id']}/status",
        headers=fpo_headers,
        json={"status": "RESOLVED"},
    )
    assert resp.status_code == 409


def test_full_dispute_resolution_flow_restores_lot_status_and_adjusts_settlement(
    client, seed_base
):
    lot_id, po = _delivered_lot_with_po(client, seed_base)
    buyer_headers = auth_headers(client, "buyer@test.demo")
    fpo_headers = auth_headers(client, "fpo@test.demo")
    transporter_headers = auth_headers(client, "transporter@test.demo")

    # Actually carry the lot through transport and delivery so its
    # pre-dispute status is realistically SETTLED, not just PO-created.
    shipment = client.post(
        "/api/shipments",
        headers=fpo_headers,
        json={
            "lot_id": lot_id,
            "purchase_order_id": po["id"],
            "transporter_id": seed_base["transporter"].id,
            "vehicle_number": "MH-TEST-9",
            "vehicle_type": "Truck",
            "capacity_kg": 5000,
            "driver_contact": "9990000000",
            "pickup_point": "Test Collection Centre",
            "delivery_point": po["delivery_location"],
            "estimated_cost": 500,
        },
    ).json()
    client.patch(
        f"/api/shipments/{shipment['id']}/status",
        headers=transporter_headers,
        json={"status": "PICKED_UP"},
    )
    client.patch(
        f"/api/shipments/{shipment['id']}/status",
        headers=transporter_headers,
        json={"status": "DELIVERED"},
    )
    client.post(
        f"/api/purchase-orders/{po['id']}/confirm-delivery",
        headers=buyer_headers,
        json={},
    )

    payments = client.get("/api/payments", headers=buyer_headers).json()
    payment = next(p for p in payments if p["purchase_order_id"] == po["id"])
    client.post(f"/api/payments/{payment['id']}/initiate", headers=buyer_headers)
    client.post(
        f"/api/payments/{payment['id']}/pay",
        headers=buyer_headers,
        json={"amount": payment["amount_due"]},
    )
    settlement = client.post(
        f"/api/settlements/{lot_id}/initiate", headers=fpo_headers
    ).json()
    original_total = settlement["total_amount"]

    dispute = client.post(
        "/api/disputes",
        headers=buyer_headers,
        json={
            "lot_id": lot_id,
            "purchase_order_id": po["id"],
            "reason": "Minor sprouting on ~2% of bags",
        },
    ).json()

    client.patch(
        f"/api/disputes/{dispute['id']}/status",
        headers=fpo_headers,
        json={"status": "UNDER_REVIEW"},
    )
    resolve_resp = client.post(
        f"/api/disputes/{dispute['id']}/resolve",
        headers=fpo_headers,
        json={
            "final_decision": "Partial adjustment approved based on delivery photos",
            "financial_adjustment": -200.0,
            "status": "RESOLVED",
        },
    )
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["status"] == "RESOLVED"

    lot_after = client.get(f"/api/lots/{lot_id}", headers=fpo_headers).json()
    assert lot_after["status"] == "SETTLED"  # restored to its pre-dispute status

    settlement_after = client.get(
        f"/api/settlements/lot/{lot_id}", headers=fpo_headers
    ).json()
    assert settlement_after["total_amount"] == round(original_total - 200.0, 2)
    assert settlement_after["status"] == "DISPUTED"
    items_total = sum(i["net_amount"] for i in settlement_after["items"])
    assert round(items_total, 2) == round(original_total - 200.0, 2)


def test_evidence_cannot_be_added_to_a_closed_dispute(client, seed_base):
    lot_id, po = _delivered_lot_with_po(client, seed_base)
    buyer_headers = auth_headers(client, "buyer@test.demo")
    fpo_headers = auth_headers(client, "fpo@test.demo")
    dispute = client.post(
        "/api/disputes",
        headers=buyer_headers,
        json={
            "lot_id": lot_id,
            "purchase_order_id": po["id"],
            "reason": "Quality issue",
        },
    ).json()
    client.post(
        f"/api/disputes/{dispute['id']}/resolve",
        headers=fpo_headers,
        json={"final_decision": "No adjustment warranted", "status": "REJECTED"},
    )
    resp = client.post(
        f"/api/disputes/{dispute['id']}/evidence",
        headers=buyer_headers,
        data={"evidence_type": "NOTE", "description": "late evidence"},
    )
    assert resp.status_code == 422


def test_unrelated_buyer_cannot_view_someone_elses_dispute(client, seed_base):
    lot_id, po = _delivered_lot_with_po(client, seed_base)
    buyer_headers = auth_headers(client, "buyer@test.demo")
    other_buyer_headers = auth_headers(client, "buyer2@test.demo")
    dispute = client.post(
        "/api/disputes",
        headers=buyer_headers,
        json={
            "lot_id": lot_id,
            "purchase_order_id": po["id"],
            "reason": "Quality issue",
        },
    ).json()
    resp = client.get(f"/api/disputes/{dispute['id']}", headers=other_buyer_headers)
    assert resp.status_code == 403
