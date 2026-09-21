from tests.conftest import auth_headers, create_lot


def _collect(client, lot_id):
    headers = auth_headers(client, "fpo@test.demo")
    client.post(f"/api/lots/{lot_id}/collect", headers=headers)


def test_preliminary_screening_never_claims_certification(client, seed_base):
    lot_id = create_lot(client, seed_base)
    _collect(client, lot_id)
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.post(f"/api/lots/{lot_id}/screen", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "certified" not in body["disclaimer"].lower()
    assert "verification required" in body["disclaimer"].lower()
    assert body["predicted_grade"] in ("A", "B", "C")


def test_screening_cannot_run_twice_on_same_lot(client, seed_base):
    lot_id = create_lot(client, seed_base)
    _collect(client, lot_id)
    headers = auth_headers(client, "fpo@test.demo")
    assert client.post(f"/api/lots/{lot_id}/screen", headers=headers).status_code == 200
    # The lot has already moved to UNDER_ASSESSMENT, so the state machine
    # itself rejects a second screening attempt as an invalid transition.
    resp = client.post(f"/api/lots/{lot_id}/screen", headers=headers)
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "INVALID_STATE_TRANSITION"


def test_screening_before_collection_is_rejected(client, seed_base):
    lot_id = create_lot(client, seed_base)
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.post(f"/api/lots/{lot_id}/screen", headers=headers)
    assert resp.status_code == 409


def test_only_assayer_can_finalize_assessment(client, seed_base):
    lot_id = create_lot(client, seed_base)
    _collect(client, lot_id)
    fpo_headers = auth_headers(client, "fpo@test.demo")
    client.post(f"/api/lots/{lot_id}/screen", headers=fpo_headers)

    resp = client.post(
        f"/api/lots/{lot_id}/assessment",
        headers=fpo_headers,
        json={"sample_quantity_kg": 20, "final_weight_kg": 1980, "final_grade": "B"},
    )
    assert resp.status_code == 403


def test_assessment_finalizes_and_sets_lot_grade(client, seed_base):
    lot_id = create_lot(client, seed_base)
    _collect(client, lot_id)
    fpo_headers = auth_headers(client, "fpo@test.demo")
    assayer_headers = auth_headers(client, "assayer@test.demo")
    client.post(f"/api/lots/{lot_id}/screen", headers=fpo_headers)

    resp = client.post(
        f"/api/lots/{lot_id}/assessment",
        headers=assayer_headers,
        json={"sample_quantity_kg": 20, "final_weight_kg": 1980, "final_grade": "B"},
    )
    assert resp.status_code == 200
    assert resp.json()["is_finalized"] is True

    lot = client.get(f"/api/lots/{lot_id}", headers=fpo_headers).json()
    assert lot["final_grade"] == "B"
    assert lot["status"] == "ASSESSED"


def test_buyer_cannot_edit_finalized_assessment(client, seed_base):
    lot_id = create_lot(client, seed_base)
    _collect(client, lot_id)
    fpo_headers = auth_headers(client, "fpo@test.demo")
    assayer_headers = auth_headers(client, "assayer@test.demo")
    client.post(f"/api/lots/{lot_id}/screen", headers=fpo_headers)
    client.post(
        f"/api/lots/{lot_id}/assessment",
        headers=assayer_headers,
        json={"sample_quantity_kg": 20, "final_weight_kg": 1980, "final_grade": "B"},
    )

    buyer_headers = auth_headers(client, "buyer@test.demo")
    resp = client.patch(
        f"/api/lots/{lot_id}/assessment/correct",
        headers=buyer_headers,
        json={"final_grade": "A", "correction_reason": "buyer trying to upgrade grade"},
    )
    assert resp.status_code == 403


def test_fpo_agent_cannot_silently_modify_assessment(client, seed_base):
    lot_id = create_lot(client, seed_base)
    _collect(client, lot_id)
    fpo_headers = auth_headers(client, "fpo@test.demo")
    assayer_headers = auth_headers(client, "assayer@test.demo")
    client.post(f"/api/lots/{lot_id}/screen", headers=fpo_headers)
    client.post(
        f"/api/lots/{lot_id}/assessment",
        headers=assayer_headers,
        json={"sample_quantity_kg": 20, "final_weight_kg": 1980, "final_grade": "B"},
    )
    resp = client.patch(
        f"/api/lots/{lot_id}/assessment/correct",
        headers=fpo_headers,
        json={"final_grade": "A", "correction_reason": "trying to change grade as FPO"},
    )
    assert resp.status_code == 403


def test_get_screening_and_assessment_endpoints(client, seed_base):
    lot_id = create_lot(client, seed_base)
    _collect(client, lot_id)
    fpo_headers = auth_headers(client, "fpo@test.demo")
    assayer_headers = auth_headers(client, "assayer@test.demo")
    client.post(f"/api/lots/{lot_id}/screen", headers=fpo_headers)
    client.post(
        f"/api/lots/{lot_id}/assessment",
        headers=assayer_headers,
        json={"sample_quantity_kg": 20, "final_weight_kg": 1980, "final_grade": "B"},
    )

    screening_resp = client.get(f"/api/lots/{lot_id}/screening", headers=fpo_headers)
    assert screening_resp.status_code == 200
    assert screening_resp.json()["predicted_grade"] in ("A", "B", "C")

    assessment_resp = client.get(f"/api/lots/{lot_id}/assessment", headers=fpo_headers)
    assert assessment_resp.status_code == 200
    assert assessment_resp.json()["final_grade"] == "B"


def test_get_screening_404s_before_it_runs(client, seed_base):
    lot_id = create_lot(client, seed_base)
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.get(f"/api/lots/{lot_id}/screening", headers=headers)
    assert resp.status_code == 404


def test_assayer_correction_creates_an_audit_entry(client, seed_base):
    lot_id = create_lot(client, seed_base)
    _collect(client, lot_id)
    fpo_headers = auth_headers(client, "fpo@test.demo")
    assayer_headers = auth_headers(client, "assayer@test.demo")
    client.post(f"/api/lots/{lot_id}/screen", headers=fpo_headers)
    client.post(
        f"/api/lots/{lot_id}/assessment",
        headers=assayer_headers,
        json={"sample_quantity_kg": 20, "final_weight_kg": 1980, "final_grade": "B"},
    )
    resp = client.patch(
        f"/api/lots/{lot_id}/assessment/correct",
        headers=assayer_headers,
        json={
            "final_weight_kg": 1975,
            "correction_reason": "re-weighed after spillage found",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["final_weight_kg"] == 1975

    admin_headers = auth_headers(client, "admin@test.demo")
    logs = client.get(
        "/api/audit-logs",
        headers=admin_headers,
        params={"action": "QUALITY_ASSESSMENT_CORRECTED"},
    ).json()
    assert len(logs) == 1
    assert logs[0]["new_value"]["reason"] == "re-weighed after spillage found"
