from tests.conftest import auth_headers, create_lot


def test_valid_image_upload_succeeds(client, seed_base):
    lot_id = create_lot(client, seed_base)
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.post(
        f"/api/uploads/lots/{lot_id}/media",
        headers=headers,
        data={"stage": "PRELIMINARY", "media_type": "PHOTO"},
        files={
            "file": ("onion_lot.png", b"\x89PNG\r\n\x1a\n" + b"0" * 1000, "image/png")
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["file_path"].startswith(f"lots/{lot_id}/")


def test_invalid_mime_type_is_rejected(client, seed_base):
    lot_id = create_lot(client, seed_base)
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.post(
        f"/api/uploads/lots/{lot_id}/media",
        headers=headers,
        data={"stage": "PRELIMINARY", "media_type": "DOCUMENT"},
        files={"file": ("malware.exe", b"MZ" + b"0" * 100, "application/x-msdownload")},
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


def test_oversized_upload_is_rejected(client, seed_base):
    lot_id = create_lot(client, seed_base)
    headers = auth_headers(client, "fpo@test.demo")
    oversized_content = b"\x89PNG\r\n\x1a\n" + b"0" * (
        6 * 1024 * 1024
    )  # > default 5MB limit
    resp = client.post(
        f"/api/uploads/lots/{lot_id}/media",
        headers=headers,
        data={"stage": "PRELIMINARY", "media_type": "PHOTO"},
        files={"file": ("huge.png", oversized_content, "image/png")},
    )
    assert resp.status_code == 422
    assert "size" in resp.json()["error"]["message"].lower()


def test_upload_for_nonexistent_lot_fails(client, seed_base):
    headers = auth_headers(client, "fpo@test.demo")
    resp = client.post(
        "/api/uploads/lots/999999/media",
        headers=headers,
        data={"stage": "PRELIMINARY", "media_type": "PHOTO"},
        files={"file": ("x.png", b"\x89PNG\r\n\x1a\n" + b"0" * 100, "image/png")},
    )
    assert resp.status_code == 404


def test_upload_requires_authentication(client, seed_base):
    lot_id = create_lot(client, seed_base)
    resp = client.post(
        f"/api/uploads/lots/{lot_id}/media",
        data={"stage": "PRELIMINARY", "media_type": "PHOTO"},
        files={"file": ("x.png", b"\x89PNG\r\n\x1a\n" + b"0" * 100, "image/png")},
    )
    assert resp.status_code == 401
