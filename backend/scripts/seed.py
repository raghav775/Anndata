"""Deterministic demo seed for AnnData.

Creates the reference data needed to run the pilot (Niphad-Lasalgaon onion
cluster) plus ONE fully completed demo transaction end-to-end (three
farmers -> aggregated lot -> screening -> assessment -> two buyer offers ->
accepted offer -> purchase order -> transport -> storage -> delivery ->
payment -> settlement -> a resolved dispute) so dashboards, settlements,
audit logs and analytics have meaningful data immediately.

ALL data created here is SYNTHETIC DEMO DATA. No real farmers, buyers,
organizations or transactions are represented.

Run with: python scripts/reset_demo.py  (wipes and reseeds)
      or: python scripts/seed.py        (seeds into the current schema)
"""

import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.commodity import Commodity, StorageFacility  # noqa: E402
from app.models.dispute import Dispute, DisputeEvidence  # noqa: E402
from app.models.enums import (  # noqa: E402
    BuyerType,
    DisputeStatus,
    Grade,
    LotStatus,
    OfferStatus,
    OfferType,
    PaymentStatus,
    POStatus,
    SensorStatus,
    SettlementStatus,
    ShipmentStatus,
    UserRole,
    VerificationStatus,
)
from app.models.finance import Payment, Settlement, SettlementItem  # noqa: E402
from app.models.logistics import Shipment, StorageBooking, StorageEvent  # noqa: E402
from app.models.lot import (  # noqa: E402
    Lot,
    LotContributor,
    PreliminaryScreening,
    QualityAssessment,
)
from app.models.marketplace import Offer, PurchaseOrder  # noqa: E402
from app.models.system import AuditLog  # noqa: E402
from app.models.user import (  # noqa: E402
    AssayerProfile,
    BuyerProfile,
    FarmerProfile,
    FPOAgentProfile,
    FPOOrganization,
    TransporterProfile,
    User,
)
from app.services.net_price import DeductionBreakdown, compute_net_price_per_kg  # noqa: E402
from app.services.settlement import ContributorShare, compute_settlement_items  # noqa: E402

DEMO_PASSWORD = "Demo@123"


def _user(db, email, full_name, role, phone, lang="en") -> User:
    user = User(
        email=email,
        hashed_password=hash_password(DEMO_PASSWORD),
        role=role,
        full_name=full_name,
        phone=phone,
        preferred_language=lang,
        is_synthetic_demo=True,
    )
    db.add(user)
    db.flush()
    return user


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == "admin@annadata.demo").first():
            print(
                "Demo data already present — skipping seed. Use reset_demo.py to reseed."
            )
            return

        print("Seeding AnnData demo data (SYNTHETIC — Niphad-Lasalgaon onion pilot)...")

        # --- Commodity -----------------------------------------------------
        onion = Commodity(
            name="Onion",
            variety="Red Onion - Nashik",
            unit="kg",
            storage_guidelines={
                "ideal_temp_c": [25, 30],
                "warning_temp_c": [20, 33],
                "ideal_humidity_pct": [65, 70],
                "warning_humidity_pct": [55, 75],
                "notes": "Onions require dry, well-ventilated storage rather than cold-chain refrigeration.",
            },
        )
        db.add(onion)
        db.flush()

        # --- FPO -------------------------------------------------------------
        fpo = FPOOrganization(
            name="Niphad Onion Farmer Producer Organization",
            registration_number="FPO-DEMO-NASHIK-001",
            village="Niphad",
            district="Nashik",
            state="Maharashtra",
            is_synthetic_demo=True,
        )
        db.add(fpo)
        db.flush()

        # --- Admin -------------------------------------------------------
        admin_user = _user(
            db,
            "admin@annadata.demo",
            "AnnData Platform Admin",
            UserRole.ADMIN,
            "9990000001",
        )

        # --- FPO agent -----------------------------------------------------
        fpo_user = _user(
            db,
            "fpo@annadata.demo",
            "Sunita Deshmukh (FPO Agent)",
            UserRole.FPO_AGENT,
            "9990000002",
            "mr",
        )
        fpo_agent = FPOAgentProfile(
            user_id=fpo_user.id, fpo_id=fpo.id, designation="Collection Centre Agent"
        )
        db.add(fpo_agent)

        # --- Farmers (SYNTHETIC DEMO RECORDS) -------------------------------
        farmer_defs = [
            ("farmer@annadata.demo", "Kavita Shinde", "9990000101", 420.0, 2.5),
            ("ganesh.patil@annadata.demo", "Ganesh Patil", "9990000102", 680.0, 4.0),
            (
                "rajendra.jadhav@annadata.demo",
                "Rajendra Jadhav",
                "9990000103",
                900.0,
                5.5,
            ),
        ]
        farmers = []
        for email, name, phone, qty, land in farmer_defs:
            u = _user(db, email, name, UserRole.FARMER, phone, "mr")
            profile = FarmerProfile(
                user_id=u.id,
                fpo_id=fpo.id,
                village="Niphad",
                taluka="Niphad",
                district="Nashik",
                state="Maharashtra",
                land_area_acres=land,
            )
            db.add(profile)
            db.flush()
            farmers.append((profile, qty))

        # --- Buyers (SYNTHETIC DEMO RECORDS) --------------------------------
        buyer_defs = [
            (
                "buyer@annadata.demo",
                "Nashik Food Processing Unit",
                BuyerType.PROCESSOR,
                "27ABCDE1234F1Z5",
            ),
            (
                "buyer2@annadata.demo",
                "Maharashtra Retail Procurement Network",
                BuyerType.RETAILER,
                "27ABCDE5678F1Z2",
            ),
            (
                "buyer3@annadata.demo",
                "Regional Onion Wholesaler",
                BuyerType.WHOLESALER,
                "27ABCDE9999F1Z9",
            ),
        ]
        buyers = []
        buyer_users = []
        for email, org, btype, gstin in buyer_defs:
            u = _user(
                db, email, f"{org} (Procurement Desk)", UserRole.BUYER, "9990000201"
            )
            profile = BuyerProfile(
                user_id=u.id,
                organization_name=org,
                buyer_type=btype,
                gstin=gstin,
                address="MIDC Industrial Area, Nashik, Maharashtra",
                verification_status=VerificationStatus.VERIFIED,
            )
            db.add(profile)
            db.flush()
            buyers.append(profile)
            buyer_users.append(u)

        # --- Assayer ---------------------------------------------------------
        assayer_user = _user(
            db, "assayer@annadata.demo", "Assayer A", UserRole.ASSAYER, "9990000301"
        )
        assayer = AssayerProfile(
            user_id=assayer_user.id,
            certification_id="ASSAY-CERT-DEMO-01",
            affiliated_fpo_id=fpo.id,
        )
        db.add(assayer)

        # --- Transporter -------------------------------------------------
        transporter_user = _user(
            db,
            "transporter@annadata.demo",
            "Nashik Agri Logistics (Dispatch)",
            UserRole.TRANSPORTER,
            "9990000401",
        )
        transporter = TransporterProfile(
            user_id=transporter_user.id,
            company_name="Nashik Agri Logistics",
            contact_phone="9990000401",
        )
        db.add(transporter)

        # --- Storage facility ------------------------------------------------
        storage_facility = StorageFacility(
            name="Niphad Onion Storage Centre",
            operator_name="Niphad Warehousing Cooperative (third-party, coordinated only)",
            village="Niphad",
            district="Nashik",
            state="Maharashtra",
            latitude=20.0859,
            longitude=74.1109,
            total_capacity_kg=50000,
            available_capacity_kg=48000,
            ventilation_type="Naturally ventilated onion chawl",
            tariff_per_kg_per_day=0.05,
            commodity_compatibility=["Onion", "Garlic"],
            insurance_provider="AgriSure Warehousing Insurance (demo)",
            liability_notes="Facility operator holds liability up to insured value; AnnData does not own this facility.",
            last_inspection_date=str(date.today() - timedelta(days=20)),
            incident_status="NONE",
            is_synthetic_demo=True,
        )
        db.add(storage_facility)
        db.flush()

        db.flush()
        print("Reference data created. Building the full demo transaction...")

        # =====================================================================
        # DEMO TRANSACTION: aggregate -> screen -> assess -> offers -> PO ->
        # transport -> storage -> delivery -> payment -> settlement -> dispute
        # =====================================================================
        total_qty = sum(qty for _, qty in farmers)
        lot = Lot(
            lot_code="LOT-2026-0001",
            commodity_id=onion.id,
            variety="Red Onion - Nashik",
            fpo_id=fpo.id,
            village_origin="Niphad",
            collection_point="Niphad Collection Centre",
            expected_harvest_date=str(date.today() - timedelta(days=10)),
            total_quantity_kg=total_qty,
            status=LotStatus.DRAFT,
            created_by_user_id=fpo_user.id,
            is_synthetic_demo=True,
        )
        db.add(lot)
        db.flush()
        for profile, qty in farmers:
            db.add(LotContributor(lot_id=lot.id, farmer_id=profile.id, quantity_kg=qty))

        _audit(
            db,
            fpo_user,
            "LOT_CREATED",
            "Lot",
            lot.id,
            new_value={"lot_code": lot.lot_code, "total_quantity_kg": total_qty},
        )

        lot.status = LotStatus.COLLECTED
        _audit(
            db,
            fpo_user,
            "LOT_COLLECTED",
            "Lot",
            lot.id,
            new_value={"status": "COLLECTED"},
        )

        # Preliminary AI screening (deterministic local mock)
        from app.services.screening import run_preliminary_screening

        screening_result = run_preliminary_screening(
            lot.lot_code, lot.total_quantity_kg
        )
        screening = PreliminaryScreening(
            lot_id=lot.id,
            predicted_grade="B",
            confidence_score=82.0,
            defect_flags=["minor visible defects", "surface damage"],
            model_version=screening_result.model_version,
            disclaimer=screening_result.disclaimer,
        )
        db.add(screening)
        lot.preliminary_grade = "B"
        lot.status = LotStatus.UNDER_ASSESSMENT
        _audit(
            db,
            fpo_user,
            "LOT_PRELIMINARY_SCREENED",
            "Lot",
            lot.id,
            new_value={"predicted_grade": "B", "confidence_score": 82.0},
        )

        # Physical assessment by the assayer (authoritative)
        assessment = QualityAssessment(
            lot_id=lot.id,
            assayer_id=assayer.id,
            sample_quantity_kg=20.0,
            final_weight_kg=1980.0,
            final_grade=Grade.B,
            visible_defects=["minor surface blemish on ~8% of sample"],
            quality_notes="Bulbs well-cured and dry. Minor surface blemishes within acceptable range for Grade B.",
            is_finalized=True,
            finalized_at=datetime.now(timezone.utc),
        )
        db.add(assessment)
        lot.final_grade = Grade.B
        lot.status = LotStatus.ASSESSED
        _audit(
            db,
            assayer_user,
            "QUALITY_ASSESSMENT_FINALIZED",
            "Lot",
            lot.id,
            new_value={"final_grade": "B", "final_weight_kg": 1980.0},
        )

        lot.status = LotStatus.OPEN_FOR_OFFERS
        _audit(
            db,
            fpo_user,
            "LOT_OPENED_FOR_OFFERS",
            "Lot",
            lot.id,
            new_value={"status": "OPEN_FOR_OFFERS"},
        )

        # Two buyer offers — Buyer A has a higher gross price but worse net
        offer_a = Offer(
            lot_id=lot.id,
            buyer_id=buyers[0].id,
            offer_type=OfferType.NEGOTIABLE,
            status=OfferStatus.ACTIVE,
            gross_price_per_kg=30.0,
            required_quantity_kg=1980.0,
            required_grade="B",
            transport_cost_per_kg=2.0,
            loading_unloading_per_kg=0.75,
            grading_fee_per_kg=0.5,
            storage_cost_per_kg=0.5,
            platform_fee_per_kg=0.25,
            other_deductions=[],
            delivery_terms="Ex-warehouse, buyer arranges final-mile transport",
            payment_timeline_days=7,
            expires_at=datetime.now(timezone.utc) + timedelta(days=5),
        )
        offer_b = Offer(
            lot_id=lot.id,
            buyer_id=buyers[1].id,
            offer_type=OfferType.NEGOTIABLE,
            status=OfferStatus.ACTIVE,
            gross_price_per_kg=29.0,
            required_quantity_kg=1980.0,
            required_grade="B",
            transport_cost_per_kg=0.75,
            loading_unloading_per_kg=0.4,
            grading_fee_per_kg=0.25,
            storage_cost_per_kg=0.1,
            platform_fee_per_kg=0.0,
            other_deductions=[],
            delivery_terms="FPO-coordinated transport to buyer warehouse",
            payment_timeline_days=5,
            expires_at=datetime.now(timezone.utc) + timedelta(days=5),
        )
        db.add_all([offer_a, offer_b])
        db.flush()
        _audit(
            db,
            buyer_users[0],
            "OFFER_SUBMITTED",
            "Offer",
            offer_a.id,
            new_value={"lot_id": lot.id, "gross_price_per_kg": 30.0},
        )
        _audit(
            db,
            buyer_users[1],
            "OFFER_SUBMITTED",
            "Offer",
            offer_b.id,
            new_value={"lot_id": lot.id, "gross_price_per_kg": 29.0},
        )

        breakdown_a = DeductionBreakdown(
            offer_a.transport_cost_per_kg,
            offer_a.loading_unloading_per_kg,
            offer_a.grading_fee_per_kg,
            offer_a.storage_cost_per_kg,
            offer_a.platform_fee_per_kg,
            offer_a.other_deductions,
        )
        breakdown_b = DeductionBreakdown(
            offer_b.transport_cost_per_kg,
            offer_b.loading_unloading_per_kg,
            offer_b.grading_fee_per_kg,
            offer_b.storage_cost_per_kg,
            offer_b.platform_fee_per_kg,
            offer_b.other_deductions,
        )
        net_a = compute_net_price_per_kg(offer_a.gross_price_per_kg, breakdown_a)
        net_b = compute_net_price_per_kg(offer_b.gross_price_per_kg, breakdown_b)
        assert (
            net_a == 26.0 and net_b == 27.5
        ), f"Unexpected net prices: {net_a}, {net_b}"

        # FPO accepts the better NET offer (Buyer B), even though gross is lower
        offer_a.status = OfferStatus.REJECTED
        offer_b.status = OfferStatus.ACCEPTED
        lot.status = LotStatus.OFFER_ACCEPTED
        _audit(
            db,
            fpo_user,
            "OFFER_ACCEPTED",
            "Offer",
            offer_b.id,
            new_value={
                "lot_id": lot.id,
                "reason": "Better net realizable price despite lower gross",
            },
        )

        po = PurchaseOrder(
            po_number="PO-2026-0001",
            lot_id=lot.id,
            offer_id=offer_b.id,
            buyer_id=buyers[1].id,
            fpo_id=fpo.id,
            quantity_kg=1980.0,
            contracted_grade="B",
            gross_price_per_kg=29.0,
            deductions=breakdown_b.as_dict(),
            net_price_per_kg=net_b,
            tolerance_rules=[
                {
                    "grade": "A",
                    "price_multiplier": 1.0,
                    "note": "Full contracted price",
                },
                {
                    "grade": "B",
                    "price_multiplier": 0.92,
                    "note": "Pre-agreed reduced price within tolerance",
                },
                {
                    "grade": "C",
                    "price_multiplier": 0.75,
                    "note": "Secondary/negotiated step-down for lower usable grade",
                },
            ],
            reject_below_grade="C",
            contamination_auto_reject=True,
            delivery_location="Maharashtra Retail Procurement Network Warehouse, Nashik MIDC",
            payment_deadline_days=7,
            inspection_deadline_days=2,
            transport_responsibility="FPO-coordinated",
            storage_responsibility="Buyer, post-delivery",
            status=POStatus.FULFILLED,
        )
        db.add(po)
        db.flush()
        lot.status = LotStatus.PURCHASE_ORDER_CREATED
        _audit(
            db,
            fpo_user,
            "PURCHASE_ORDER_CREATED",
            "PurchaseOrder",
            po.id,
            new_value={"po_number": po.po_number, "net_price_per_kg": net_b},
        )

        payment = Payment(
            purchase_order_id=po.id,
            lot_id=lot.id,
            buyer_id=buyers[1].id,
            amount_due=round(net_b * 1980.0, 2),
            amount_received=round(net_b * 1980.0, 2),
            status=PaymentStatus.PAYMENT_COMPLETED,
            transaction_reference="TXN-DEMO0001A1",
            initiated_at=datetime.now(timezone.utc) - timedelta(days=1),
            completed_at=datetime.now(timezone.utc),
        )
        db.add(payment)
        db.flush()
        _audit(
            db,
            admin_user,
            "PAYMENT_INITIATED",
            "Payment",
            payment.id,
            new_value={"transaction_reference": payment.transaction_reference},
        )
        _audit(
            db,
            admin_user,
            "PAYMENT_RECEIVED",
            "Payment",
            payment.id,
            new_value={
                "amount": payment.amount_received,
                "status": "PAYMENT_COMPLETED",
            },
        )

        shipment = Shipment(
            lot_id=lot.id,
            purchase_order_id=po.id,
            transporter_id=transporter.id,
            vehicle_number="MH-15-BT-4521",
            vehicle_type="Open truck, 5 tonne",
            capacity_kg=5000,
            driver_contact="9990000499",
            pickup_point="Niphad Collection Centre",
            delivery_point=po.delivery_location,
            estimated_cost=1500.0,
            pickup_scheduled_at=datetime.now(timezone.utc) - timedelta(days=2),
            picked_up_at=datetime.now(timezone.utc) - timedelta(days=2),
            delivered_at=datetime.now(timezone.utc) - timedelta(days=1),
            status=ShipmentStatus.DELIVERED,
        )
        db.add(shipment)
        db.flush()
        lot.status = LotStatus.DELIVERED
        _audit(
            db,
            transporter_user,
            "TRANSPORT_ASSIGNED",
            "Shipment",
            shipment.id,
            new_value={"lot_id": lot.id, "vehicle_number": shipment.vehicle_number},
        )
        _audit(
            db,
            transporter_user,
            "SHIPMENT_STATUS_UPDATED",
            "Shipment",
            shipment.id,
            new_value={"status": "DELIVERED"},
        )
        _audit(
            db,
            admin_user,
            "DELIVERY_CONFIRMED",
            "PurchaseOrder",
            po.id,
            new_value={"delivered_grade": "B", "outcome": "ACCEPTED_FULL"},
        )

        storage_booking = StorageBooking(
            lot_id=lot.id,
            facility_id=storage_facility.id,
            booked_quantity_kg=500.0,
            start_date=str(date.today() - timedelta(days=3)),
            end_date=str(date.today() + timedelta(days=7)),
        )
        db.add(storage_booking)
        storage_facility.available_capacity_kg -= 500.0
        db.flush()
        _audit(
            db,
            fpo_user,
            "STORAGE_BOOKED",
            "StorageBooking",
            lot.id,
            new_value={"facility_id": storage_facility.id, "booked_quantity_kg": 500.0},
        )

        for i in range(6):
            db.add(
                StorageEvent(
                    facility_id=storage_facility.id,
                    booking_id=storage_booking.id,
                    temperature_celsius=26.5 + i * 0.3,
                    humidity_percent=67.0 + i * 0.5,
                    occupancy_percent=52.0 + i,
                    status=SensorStatus.NORMAL if i < 5 else SensorStatus.WARNING,
                    recorded_at=datetime.now(timezone.utc) - timedelta(hours=6 - i),
                )
            )

        settlement = Settlement(
            lot_id=lot.id,
            payment_id=payment.id,
            total_amount=payment.amount_received,
            status=SettlementStatus.COMPLETED,
        )
        db.add(settlement)
        db.flush()
        lines = compute_settlement_items(
            contributors=[
                ContributorShare(profile.id, qty) for profile, qty in farmers
            ],
            total_amount=payment.amount_received,
        )
        for line in lines:
            db.add(
                SettlementItem(
                    settlement_id=settlement.id,
                    farmer_id=line.farmer_id,
                    contributed_quantity_kg=line.contributed_quantity_kg,
                    share_percentage=line.share_percentage,
                    gross_share_amount=line.gross_share_amount,
                    deduction_amount=line.deduction_amount,
                    net_amount=line.net_amount,
                    payment_status="PAID",
                    paid_at=datetime.now(timezone.utc),
                    transaction_reference=f"TXN-DEMO-SETL-{line.farmer_id}",
                )
            )
        lot.status = LotStatus.SETTLED
        _audit(
            db,
            fpo_user,
            "SETTLEMENT_INITIATED",
            "Settlement",
            settlement.id,
            new_value={"lot_id": lot.id, "total_amount": payment.amount_received},
        )

        # A resolved quality dispute, to populate the dispute dashboard
        dispute = Dispute(
            dispute_code="DSP-2026-0001",
            lot_id=lot.id,
            purchase_order_id=po.id,
            raised_by_user_id=buyers[1].user_id,
            reason="A small number of bags in the delivered lot showed sprouting beyond the sample checked at assessment.",
            status=DisputeStatus.RESOLVED,
            proposed_resolution="Partial price adjustment for the affected bags instead of full lot rejection.",
            final_decision=(
                "Reviewed assessment photos, delivery timestamp and buyer-submitted evidence. "
                "Affected quantity confirmed at ~45kg of 1980kg (2.3%), within acceptable tolerance for a "
                "documented partial adjustment rather than lot rejection."
            ),
            financial_adjustment=-450.0,
            resolved_by_user_id=fpo_user.id,
            resolved_at=datetime.now(timezone.utc),
        )
        db.add(dispute)
        db.flush()
        db.add(
            DisputeEvidence(
                dispute_id=dispute.id,
                evidence_type="NOTE",
                description="Buyer-submitted photos showing sprouting on a sub-sample of delivered bags (referenced offline for this demo record).",
                uploaded_by_user_id=buyers[1].user_id,
            )
        )
        settlement.other_deductions = [
            {"label": f"Dispute {dispute.dispute_code} adjustment", "amount": -450.0}
        ]
        settlement.total_amount = round(settlement.total_amount - 450.0, 2)
        settlement.status = SettlementStatus.DISPUTED
        db.flush()
        adjusted_lines = compute_settlement_items(
            contributors=[
                ContributorShare(profile.id, qty) for profile, qty in farmers
            ],
            total_amount=settlement.total_amount,
        )
        adjusted_by_farmer = {line.farmer_id: line for line in adjusted_lines}
        for item in settlement.items:
            adjusted = adjusted_by_farmer[item.farmer_id]
            item.gross_share_amount = adjusted.gross_share_amount
            item.deduction_amount = adjusted.deduction_amount
            item.net_amount = adjusted.net_amount
        _audit(
            db,
            buyer_users[1],
            "DISPUTE_OPENED",
            "Dispute",
            dispute.id,
            new_value={"lot_id": lot.id},
        )
        _audit(
            db,
            fpo_user,
            "DISPUTE_RESOLVED",
            "Dispute",
            dispute.id,
            new_value={"status": "RESOLVED", "financial_adjustment": -450.0},
        )

        db.commit()
        print(
            "Demo transaction LOT-2026-0001 seeded successfully (2,000kg onion lot, settled, one resolved dispute)."
        )
        print(f"\nAll demo accounts use the password: {DEMO_PASSWORD}\n")
        for email, *_ in farmer_defs:
            print(f"  farmer     {email}")
        print("  fpo_agent  fpo@annadata.demo")
        for email, *_ in buyer_defs:
            print(f"  buyer      {email}")
        print("  assayer    assayer@annadata.demo")
        print("  transporter transporter@annadata.demo")
        print("  admin      admin@annadata.demo")
    finally:
        db.close()


def _audit(
    db, actor, action, entity_type, entity_id, new_value=None, old_value=None
) -> None:
    db.add(
        AuditLog(
            actor_user_id=getattr(actor, "id", None),
            actor_role=getattr(actor, "role", None).value
            if getattr(actor, "role", None)
            else "SYSTEM",
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            old_value=old_value,
            new_value=new_value,
        )
    )


if __name__ == "__main__":
    seed()
