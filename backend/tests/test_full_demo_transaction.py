"""End-to-end test of the full AnnData demo transaction described in the
product spec: three farmers -> aggregated lot -> preliminary screening ->
physical assessment -> two buyer offers -> net-price comparison -> accepted
offer -> purchase order -> transport -> storage -> delivery -> payment ->
itemized settlement -> a dispute with evidence -> resolution.

This is the single most important test in the suite: if this passes, the
core business workflow genuinely works end to end through the real API.
"""

from tests.conftest import auth_headers


def test_complete_demo_transaction(client, seed_base):
    fpo = auth_headers(client, "fpo@test.demo")
    assayer = auth_headers(client, "assayer@test.demo")
    buyer_a = auth_headers(client, "buyer@test.demo")
    buyer_b = auth_headers(client, "buyer2@test.demo")
    transporter = auth_headers(client, "transporter@test.demo")
    admin = auth_headers(client, "admin@test.demo")
    farmer = auth_headers(client, "farmer@test.demo")

    # 1-2: onboard farmers (already seeded) and aggregate into one lot.
    lot_resp = client.post(
        "/api/lots",
        headers=fpo,
        json={
            "commodity_id": seed_base["commodity"].id,
            "variety": "Red Onion - Nashik",
            "fpo_id": seed_base["fpo"].id,
            "village_origin": "Niphad",
            "collection_point": "Niphad Collection Centre",
            "contributors": [
                {"farmer_id": seed_base["farmer"].id, "quantity_kg": 420},
                {"farmer_id": seed_base["farmer2"].id, "quantity_kg": 680},
            ],
        },
    )
    assert lot_resp.status_code == 200
    lot = lot_resp.json()
    lot_id = lot["id"]
    assert lot["total_quantity_kg"] == 1100

    assert client.post(f"/api/lots/{lot_id}/collect", headers=fpo).status_code == 200

    # 3-4: preliminary AI screening (non-authoritative).
    screen_resp = client.post(f"/api/lots/{lot_id}/screen", headers=fpo)
    assert screen_resp.status_code == 200
    assert "physical verification required" in screen_resp.json()["disclaimer"].lower()

    # 5: physical assessment by the assayer is authoritative.
    assess_resp = client.post(
        f"/api/lots/{lot_id}/assessment",
        headers=assayer,
        json={
            "sample_quantity_kg": 15,
            "final_weight_kg": 1090,
            "final_grade": "B",
            "visible_defects": ["minor surface blemish"],
            "quality_notes": "Well-cured bulbs, acceptable for Grade B.",
        },
    )
    assert assess_resp.status_code == 200
    assert assess_resp.json()["is_finalized"] is True

    assert (
        client.post(f"/api/lots/{lot_id}/open-for-offers", headers=fpo).status_code
        == 200
    )

    # 6-7: two buyers submit offers; net realizable price determines the winner.
    offer_a = client.post(
        "/api/offers",
        headers=buyer_a,
        json={
            "lot_id": lot_id,
            "offer_type": "NEGOTIABLE",
            "gross_price_per_kg": 30,
            "required_quantity_kg": 1090,
            "required_grade": "B",
            "transport_cost_per_kg": 2.0,
            "loading_unloading_per_kg": 0.75,
            "grading_fee_per_kg": 0.5,
            "storage_cost_per_kg": 0.5,
            "platform_fee_per_kg": 0.25,
        },
    ).json()
    offer_b = client.post(
        "/api/offers",
        headers=buyer_b,
        json={
            "lot_id": lot_id,
            "offer_type": "NEGOTIABLE",
            "gross_price_per_kg": 29,
            "required_quantity_kg": 1090,
            "required_grade": "B",
            "transport_cost_per_kg": 0.75,
            "loading_unloading_per_kg": 0.4,
            "grading_fee_per_kg": 0.25,
            "storage_cost_per_kg": 0.1,
        },
    ).json()
    assert offer_a["net_price_per_kg"] == 26.0
    assert offer_b["net_price_per_kg"] == 27.5

    comparison = client.get(f"/api/offers/lot/{lot_id}", headers=fpo).json()
    assert comparison["best_offer_id"] == offer_b["id"]

    # 8-9: FPO accepts the better NET offer and issues a purchase order.
    assert (
        client.post(f"/api/offers/{offer_b['id']}/accept", headers=fpo).status_code
        == 200
    )
    po_resp = client.post(
        "/api/purchase-orders",
        headers=fpo,
        json={
            "offer_id": offer_b["id"],
            "delivery_location": "Buyer B Warehouse, Nashik MIDC",
        },
    )
    assert po_resp.status_code == 200
    po = po_resp.json()
    assert po["net_price_per_kg"] == 27.5
    assert po["reject_below_grade"] == "C"
    assert len(po["tolerance_rules"]) >= 1

    # 10: assign transporter.
    shipment_resp = client.post(
        "/api/shipments",
        headers=fpo,
        json={
            "lot_id": lot_id,
            "purchase_order_id": po["id"],
            "transporter_id": seed_base["transporter"].id,
            "vehicle_number": "MH-15-TEST-1",
            "vehicle_type": "Open truck",
            "capacity_kg": 5000,
            "driver_contact": "9990000000",
            "pickup_point": "Niphad Collection Centre",
            "delivery_point": po["delivery_location"],
            "estimated_cost": 800,
        },
    )
    assert shipment_resp.status_code == 200
    shipment = shipment_resp.json()

    # 11: optionally book storage.
    storage_resp = client.post(
        "/api/storage/bookings",
        headers=fpo,
        json={
            "lot_id": lot_id,
            "facility_id": seed_base["facility"].id,
            "booked_quantity_kg": 200,
            "start_date": "2026-01-01",
        },
    )
    assert storage_resp.status_code == 200

    # 12: simulated IoT reading.
    iot_resp = client.post(
        f"/api/storage/{seed_base['facility'].id}/events/simulate", headers=fpo
    )
    assert iot_resp.status_code == 200
    assert iot_resp.json()["status"] in ("NORMAL", "WARNING", "ALERT")

    # Transporter moves the shipment through to delivered.
    assert (
        client.patch(
            f"/api/shipments/{shipment['id']}/status",
            headers=transporter,
            json={"status": "PICKED_UP"},
        ).status_code
        == 200
    )
    lot_after_pickup = client.get(f"/api/lots/{lot_id}", headers=fpo).json()
    assert lot_after_pickup["status"] == "DISPATCHED"

    assert (
        client.patch(
            f"/api/shipments/{shipment['id']}/status",
            headers=transporter,
            json={"status": "DELIVERED"},
        ).status_code
        == 200
    )

    # 13: buyer confirms delivery.
    confirm_resp = client.post(
        f"/api/purchase-orders/{po['id']}/confirm-delivery", headers=buyer_b, json={}
    )
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["outcome"] == "ACCEPTED_FULL"

    lot_after_delivery = client.get(f"/api/lots/{lot_id}", headers=fpo).json()
    assert lot_after_delivery["status"] == "DELIVERED"

    # 14: payment moves through the workflow.
    payments = client.get("/api/payments", headers=buyer_b).json()
    payment = next(p for p in payments if p["purchase_order_id"] == po["id"])
    assert (
        client.post(
            f"/api/payments/{payment['id']}/initiate", headers=buyer_b
        ).status_code
        == 200
    )
    pay_resp = client.post(
        f"/api/payments/{payment['id']}/pay",
        headers=buyer_b,
        json={"amount": payment["amount_due"]},
    )
    assert pay_resp.status_code == 200
    assert pay_resp.json()["status"] == "PAYMENT_COMPLETED"

    # 15: every farmer sees their own itemized settlement.
    settlement_resp = client.post(f"/api/settlements/{lot_id}/initiate", headers=fpo)
    assert settlement_resp.status_code == 200
    settlement = settlement_resp.json()
    assert len(settlement["items"]) == 2
    assert round(sum(i["net_amount"] for i in settlement["items"]), 2) == round(
        payment["amount_due"], 2
    )

    farmer_view = client.get(f"/api/settlements/lot/{lot_id}", headers=farmer).json()
    assert len(farmer_view["items"]) == 1
    assert farmer_view["items"][0]["farmer_id"] == seed_base["farmer"].id

    # 16-17: raise and resolve a quality dispute with evidence.
    dispute_resp = client.post(
        "/api/disputes",
        headers=buyer_b,
        json={
            "lot_id": lot_id,
            "purchase_order_id": po["id"],
            "reason": "A portion of bags showed sprouting on arrival.",
        },
    )
    assert dispute_resp.status_code == 200
    dispute = dispute_resp.json()

    evidence_resp = client.post(
        f"/api/disputes/{dispute['id']}/evidence",
        headers=buyer_b,
        data={"evidence_type": "NOTE", "description": "Delivery-dock photos reference"},
    )
    assert evidence_resp.status_code == 200

    client.patch(
        f"/api/disputes/{dispute['id']}/status",
        headers=fpo,
        json={"status": "UNDER_REVIEW"},
    )
    resolve_resp = client.post(
        f"/api/disputes/{dispute['id']}/resolve",
        headers=fpo,
        json={
            "final_decision": "Confirmed minor sprouting on <3% of bags; partial adjustment applied.",
            "financial_adjustment": -100.0,
            "status": "RESOLVED",
        },
    )
    assert resolve_resp.status_code == 200

    lot_final = client.get(f"/api/lots/{lot_id}", headers=fpo).json()
    assert lot_final["status"] == "SETTLED"  # restored after dispute resolution

    # The full audit trail exists for every important mutation.
    logs = client.get(
        "/api/audit-logs",
        headers=admin,
        params={"entity_type": "Lot", "entity_id": str(lot_id)},
    ).json()
    actions = {log["action"] for log in logs}
    assert {
        "LOT_CREATED",
        "LOT_COLLECTED",
        "LOT_PRELIMINARY_SCREENED",
        "QUALITY_ASSESSMENT_FINALIZED",
        "LOT_OPENED_FOR_OFFERS",
    }.issubset(actions)

    dispute_logs = client.get(
        "/api/audit-logs",
        headers=admin,
        params={"entity_type": "Dispute", "entity_id": str(dispute["id"])},
    ).json()
    dispute_actions = {log["action"] for log in dispute_logs}
    assert {"DISPUTE_OPENED", "DISPUTE_RESOLVED"}.issubset(dispute_actions)
