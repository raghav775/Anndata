from tests.conftest import (
    accept_offer_and_create_po,
    auth_headers,
    create_lot,
    progress_lot_to_open_for_offers,
    submit_offer,
)


def _po_and_payment(client, seed_base):
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
    payments = client.get(
        "/api/payments", headers=auth_headers(client, "buyer@test.demo")
    ).json()
    payment = next(p for p in payments if p["purchase_order_id"] == po["id"])
    return lot_id, po, payment


def test_purchase_order_requires_accepted_offer(client, seed_base):
    lot_id = create_lot(client, seed_base)
    progress_lot_to_open_for_offers(client, seed_base, lot_id)
    offer_id = submit_offer(client, "buyer@test.demo", lot_id, gross_price_per_kg=29)
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.post(
        "/api/purchase-orders",
        headers=headers,
        json={"offer_id": offer_id, "delivery_location": "X"},
    )
    assert resp.status_code == 422  # offer not yet ACCEPTED


def test_purchase_order_carries_tolerance_and_net_price(client, seed_base):
    _, po, _ = _po_and_payment(client, seed_base)
    assert po["net_price_per_kg"] == 27.5
    assert po["contracted_grade"] == "B"
    assert len(po["tolerance_rules"]) == 3
    assert po["po_number"].startswith("PO-")


def test_purchase_order_creates_pending_payment(client, seed_base):
    _, po, payment = _po_and_payment(client, seed_base)
    assert payment["status"] == "PAYMENT_PENDING"
    assert payment["amount_due"] == round(27.5 * 1980, 2)


def test_cannot_pay_before_initiating(client, seed_base):
    _, _, payment = _po_and_payment(client, seed_base)
    headers = auth_headers(client, "buyer@test.demo")
    resp = client.post(
        f"/api/payments/{payment['id']}/pay", headers=headers, json={"amount": 100}
    )
    assert resp.status_code == 422


def test_payment_larger_than_due_is_rejected(client, seed_base):
    _, _, payment = _po_and_payment(client, seed_base)
    headers = auth_headers(client, "buyer@test.demo")
    client.post(f"/api/payments/{payment['id']}/initiate", headers=headers)
    resp = client.post(
        f"/api/payments/{payment['id']}/pay",
        headers=headers,
        json={"amount": payment["amount_due"] + 10000},
    )
    assert resp.status_code == 422


def test_partial_payment_then_completion(client, seed_base):
    _, _, payment = _po_and_payment(client, seed_base)
    headers = auth_headers(client, "buyer@test.demo")
    client.post(f"/api/payments/{payment['id']}/initiate", headers=headers)

    half = round(payment["amount_due"] / 2, 2)
    resp = client.post(
        f"/api/payments/{payment['id']}/pay", headers=headers, json={"amount": half}
    )
    assert resp.json()["status"] == "PARTIALLY_PAID"

    remaining = round(payment["amount_due"] - half, 2)
    resp2 = client.post(
        f"/api/payments/{payment['id']}/pay",
        headers=headers,
        json={"amount": remaining},
    )
    assert resp2.json()["status"] == "PAYMENT_COMPLETED"


def test_duplicate_payment_after_completion_is_rejected(client, seed_base):
    _, _, payment = _po_and_payment(client, seed_base)
    headers = auth_headers(client, "buyer@test.demo")
    client.post(f"/api/payments/{payment['id']}/initiate", headers=headers)
    client.post(
        f"/api/payments/{payment['id']}/pay",
        headers=headers,
        json={"amount": payment["amount_due"]},
    )

    resp = client.post(
        f"/api/payments/{payment['id']}/pay", headers=headers, json={"amount": 1}
    )
    assert resp.status_code == 422


def test_other_buyer_cannot_pay_someone_elses_payment(client, seed_base):
    _, _, payment = _po_and_payment(client, seed_base)
    other_buyer_headers = auth_headers(client, "buyer2@test.demo")
    resp = client.post(
        f"/api/payments/{payment['id']}/initiate", headers=other_buyer_headers
    )
    assert resp.status_code == 403


def test_settlement_requires_completed_payment(client, seed_base):
    lot_id, po, payment = _po_and_payment(client, seed_base)
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.post(f"/api/settlements/{lot_id}/initiate", headers=headers)
    assert resp.status_code == 422


def test_settlement_produces_itemized_lines_for_every_farmer(client, seed_base):
    lot_id, po, payment = _po_and_payment(client, seed_base)
    buyer_headers = auth_headers(client, "buyer@test.demo")
    client.post(f"/api/payments/{payment['id']}/initiate", headers=buyer_headers)
    client.post(
        f"/api/payments/{payment['id']}/pay",
        headers=buyer_headers,
        json={"amount": payment["amount_due"]},
    )

    fpo_headers = auth_headers(client, "fpo@test.demo")
    resp = client.post(f"/api/settlements/{lot_id}/initiate", headers=fpo_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["items"]) == 2  # two contributing farmers in create_lot() default
    total = sum(item["net_amount"] for item in body["items"])
    assert round(total, 2) == round(payment["amount_due"], 2)


def test_duplicate_settlement_is_rejected(client, seed_base):
    lot_id, po, payment = _po_and_payment(client, seed_base)
    buyer_headers = auth_headers(client, "buyer@test.demo")
    client.post(f"/api/payments/{payment['id']}/initiate", headers=buyer_headers)
    client.post(
        f"/api/payments/{payment['id']}/pay",
        headers=buyer_headers,
        json={"amount": payment["amount_due"]},
    )

    fpo_headers = auth_headers(client, "fpo@test.demo")
    assert (
        client.post(
            f"/api/settlements/{lot_id}/initiate", headers=fpo_headers
        ).status_code
        == 200
    )
    resp = client.post(f"/api/settlements/{lot_id}/initiate", headers=fpo_headers)
    assert resp.status_code == 422


def test_farmer_sees_only_their_own_settlement_item(client, seed_base):
    lot_id, po, payment = _po_and_payment(client, seed_base)
    buyer_headers = auth_headers(client, "buyer@test.demo")
    client.post(f"/api/payments/{payment['id']}/initiate", headers=buyer_headers)
    client.post(
        f"/api/payments/{payment['id']}/pay",
        headers=buyer_headers,
        json={"amount": payment["amount_due"]},
    )
    fpo_headers = auth_headers(client, "fpo@test.demo")
    client.post(f"/api/settlements/{lot_id}/initiate", headers=fpo_headers)

    farmer_headers = auth_headers(client, "farmer@test.demo")
    resp = client.get(f"/api/settlements/lot/{lot_id}", headers=farmer_headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 1
    assert items[0]["farmer_id"] == seed_base["farmer"].id
