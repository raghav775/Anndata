import os

os.environ.setdefault("ANNADATA_ENV", "test")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password, pwd_context
from app.main import app

# bcrypt's cost factor is intentionally slow; the default (12 rounds) makes
# the hundreds of demo-user hashes created across this suite take minutes.
# Lowering it here only affects this test process, never production.
pwd_context.update(bcrypt__rounds=4)
from app.models.commodity import Commodity, StorageFacility
from app.models.enums import BuyerType, UserRole, VerificationStatus
from app.models.user import (
    AssayerProfile,
    BuyerProfile,
    FarmerProfile,
    FPOAgentProfile,
    FPOOrganization,
    TransporterProfile,
    User,
)

TEST_PASSWORD = "Test@1234"


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield session
    finally:
        session.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def isolated_upload_storage(tmp_path, monkeypatch):
    """Redirect file uploads to a per-test temp directory instead of the
    real backend/uploads folder."""
    import app.services.file_storage as file_storage

    monkeypatch.setattr(
        file_storage,
        "get_storage",
        lambda: file_storage.LocalFileStorage(str(tmp_path)),
    )
    for module_name in ("app.api.uploads", "app.api.disputes"):
        import importlib

        module = importlib.import_module(module_name)
        monkeypatch.setattr(module, "get_storage", file_storage.get_storage)


@pytest.fixture()
def client(db_session):
    return TestClient(app)


@pytest.fixture()
def seed_base(db_session):
    """Minimal reference data most tests build on: one FPO, one commodity,
    one storage facility, and one user+profile per role."""
    commodity = Commodity(
        name="Onion", variety="Red Onion - Nashik", unit="kg", storage_guidelines={}
    )
    db_session.add(commodity)

    fpo = FPOOrganization(
        name="Test FPO", village="Niphad", district="Nashik", state="Maharashtra"
    )
    db_session.add(fpo)
    db_session.flush()

    facility = StorageFacility(
        name="Test Storage",
        operator_name="Test Operator",
        village="Niphad",
        district="Nashik",
        state="Maharashtra",
        total_capacity_kg=10000,
        available_capacity_kg=10000,
    )
    db_session.add(facility)

    def make_user(email, role, full_name="Test User", phone="9990000000"):
        user = User(
            email=email,
            hashed_password=hash_password(TEST_PASSWORD),
            role=role,
            full_name=full_name,
            phone=phone,
        )
        db_session.add(user)
        db_session.flush()
        return user

    admin = make_user("admin@test.demo", UserRole.ADMIN, "Test Admin")

    fpo_user = make_user("fpo@test.demo", UserRole.FPO_AGENT, "Test FPO Agent")
    fpo_agent = FPOAgentProfile(user_id=fpo_user.id, fpo_id=fpo.id)
    db_session.add(fpo_agent)

    farmer_user = make_user("farmer@test.demo", UserRole.FARMER, "Test Farmer")
    farmer = FarmerProfile(
        user_id=farmer_user.id,
        fpo_id=fpo.id,
        village="Niphad",
        taluka="Niphad",
        district="Nashik",
        state="Maharashtra",
    )
    db_session.add(farmer)

    farmer2_user = make_user("farmer2@test.demo", UserRole.FARMER, "Test Farmer Two")
    farmer2 = FarmerProfile(
        user_id=farmer2_user.id,
        fpo_id=fpo.id,
        village="Niphad",
        taluka="Niphad",
        district="Nashik",
        state="Maharashtra",
    )
    db_session.add(farmer2)

    buyer_user = make_user("buyer@test.demo", UserRole.BUYER, "Test Buyer")
    buyer = BuyerProfile(
        user_id=buyer_user.id,
        organization_name="Test Buyer Org",
        buyer_type=BuyerType.PROCESSOR,
        address="Test Address",
        verification_status=VerificationStatus.VERIFIED,
    )
    db_session.add(buyer)

    buyer2_user = make_user("buyer2@test.demo", UserRole.BUYER, "Test Buyer Two")
    buyer2 = BuyerProfile(
        user_id=buyer2_user.id,
        organization_name="Test Buyer Org Two",
        buyer_type=BuyerType.WHOLESALER,
        address="Test Address",
        verification_status=VerificationStatus.VERIFIED,
    )
    db_session.add(buyer2)

    unverified_buyer_user = make_user(
        "buyer3@test.demo", UserRole.BUYER, "Unverified Buyer"
    )
    unverified_buyer = BuyerProfile(
        user_id=unverified_buyer_user.id,
        organization_name="Unverified Org",
        buyer_type=BuyerType.RETAILER,
        address="Test Address",
        verification_status=VerificationStatus.UNVERIFIED,
    )
    db_session.add(unverified_buyer)

    assayer_user = make_user("assayer@test.demo", UserRole.ASSAYER, "Test Assayer")
    assayer = AssayerProfile(user_id=assayer_user.id, affiliated_fpo_id=fpo.id)
    db_session.add(assayer)

    transporter_user = make_user(
        "transporter@test.demo", UserRole.TRANSPORTER, "Test Transporter"
    )
    transporter = TransporterProfile(
        user_id=transporter_user.id,
        company_name="Test Transport Co",
        contact_phone="9990000009",
    )
    db_session.add(transporter)

    db_session.commit()
    for obj in (
        commodity,
        fpo,
        facility,
        admin,
        fpo_user,
        fpo_agent,
        farmer_user,
        farmer,
        farmer2_user,
        farmer2,
        buyer_user,
        buyer,
        buyer2_user,
        buyer2,
        unverified_buyer_user,
        unverified_buyer,
        assayer_user,
        assayer,
        transporter_user,
        transporter,
    ):
        db_session.refresh(obj)

    return {
        "commodity": commodity,
        "fpo": fpo,
        "facility": facility,
        "admin": admin,
        "fpo_user": fpo_user,
        "farmer_user": farmer_user,
        "farmer": farmer,
        "farmer2_user": farmer2_user,
        "farmer2": farmer2,
        "buyer_user": buyer_user,
        "buyer": buyer,
        "buyer2_user": buyer2_user,
        "buyer2": buyer2,
        "unverified_buyer_user": unverified_buyer_user,
        "assayer_user": assayer_user,
        "assayer": assayer,
        "transporter_user": transporter_user,
        "transporter": transporter,
    }


def auth_headers(client: TestClient, email: str, password: str = TEST_PASSWORD) -> dict:
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_lot(
    client: TestClient, seed_base: dict, quantities: tuple[float, ...] = (420, 680, 900)
) -> int:
    headers = auth_headers(client, "fpo@test.demo")
    contributors = [{"farmer_id": seed_base["farmer"].id, "quantity_kg": quantities[0]}]
    if len(quantities) > 1:
        contributors.append(
            {"farmer_id": seed_base["farmer2"].id, "quantity_kg": quantities[1]}
        )
    resp = client.post(
        "/api/lots",
        headers=headers,
        json={
            "commodity_id": seed_base["commodity"].id,
            "variety": "Red Onion - Nashik",
            "fpo_id": seed_base["fpo"].id,
            "village_origin": "Niphad",
            "collection_point": "Niphad Collection Centre",
            "contributors": contributors,
        },
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


def progress_lot_to_open_for_offers(
    client: TestClient, seed_base: dict, lot_id: int
) -> None:
    fpo_headers = auth_headers(client, "fpo@test.demo")
    assayer_headers = auth_headers(client, "assayer@test.demo")

    assert (
        client.post(f"/api/lots/{lot_id}/collect", headers=fpo_headers).status_code
        == 200
    )
    assert (
        client.post(f"/api/lots/{lot_id}/screen", headers=fpo_headers).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/lots/{lot_id}/assessment",
            headers=assayer_headers,
            json={
                "sample_quantity_kg": 20,
                "final_weight_kg": 1980,
                "final_grade": "B",
                "visible_defects": [],
                "quality_notes": "Test assessment",
            },
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/lots/{lot_id}/open-for-offers", headers=fpo_headers
        ).status_code
        == 200
    )


def submit_offer(
    client: TestClient,
    email: str,
    lot_id: int,
    gross_price_per_kg: float,
    transport_cost_per_kg: float = 0.0,
    quantity: float = 1980,
) -> int:
    headers = auth_headers(client, email)
    resp = client.post(
        "/api/offers",
        headers=headers,
        json={
            "lot_id": lot_id,
            "offer_type": "NEGOTIABLE",
            "gross_price_per_kg": gross_price_per_kg,
            "required_quantity_kg": quantity,
            "required_grade": "B",
            "transport_cost_per_kg": transport_cost_per_kg,
        },
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


def accept_offer_and_create_po(
    client: TestClient, offer_id: int, delivery_location: str = "Test Warehouse"
) -> dict:
    fpo_headers = auth_headers(client, "fpo@test.demo")
    accept = client.post(f"/api/offers/{offer_id}/accept", headers=fpo_headers)
    assert accept.status_code == 200, accept.text
    resp = client.post(
        "/api/purchase-orders",
        headers=fpo_headers,
        json={"offer_id": offer_id, "delivery_location": delivery_location},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()
