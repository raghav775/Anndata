"""Deterministic demo seed for AnnData.

Creates the reference data needed to run the pilot (Niphad-Lasalgaon onion
cluster) plus an EXTENSIVE set of demo transactions spanning every lot
status, offer/payment/settlement/dispute state, and role — not just one
lot — so every dashboard, list and chart has substantial, realistic data
immediately after a fresh install.

Village names, taluka groupings, onion varieties and price bands are drawn
from public reference data researched for this pilot — see
`research/README.md` at the repository root for sources. The specific
farmers, organizations, and transactions themselves remain entirely
SYNTHETIC — no real people or businesses are represented.

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
from app.services.codes import (  # noqa: E402
    generate_dispute_code,
    generate_lot_code,
    generate_po_number,
    generate_transaction_reference,
)
from app.services.net_price import DeductionBreakdown, compute_net_price_per_kg  # noqa: E402
from app.services.screening import run_preliminary_screening  # noqa: E402
from app.services.settlement import ContributorShare, compute_settlement_items  # noqa: E402
from app.services.tolerance import resolve_tolerance_pricing  # noqa: E402

DEMO_PASSWORD = "Demo@123"

TOLERANCE_RULES = [
    {"grade": "A", "price_multiplier": 1.0, "note": "Full contracted price"},
    {"grade": "B", "price_multiplier": 0.92, "note": "Pre-agreed reduced price within tolerance"},
    {"grade": "C", "price_multiplier": 0.75, "note": "Secondary/negotiated step-down for lower usable grade"},
]


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


def _audit(db, actor, action, entity_type, entity_id, new_value=None, old_value=None) -> None:
    db.add(
        AuditLog(
            actor_user_id=getattr(actor, "id", None),
            actor_role=(getattr(actor, "role", None).value if getattr(actor, "role", None) else "SYSTEM"),
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            old_value=old_value,
            new_value=new_value,
        )
    )


# =============================================================================
# Workflow helpers — each mirrors the corresponding API endpoint's business
# logic (reusing the same service functions) so seeded lots are built the
# same way a real user's actions would build them, just without the HTTP
# round-trip. Used to cheaply construct many lots across every status.
# =============================================================================


def _new_lot(db, *, fpo, commodity, contributors, village, collection_point, variety, created_by, days_ago=0):
    total_qty = sum(qty for _farmer, qty in contributors)
    lot = Lot(
        lot_code=generate_lot_code(db),
        commodity_id=commodity.id,
        variety=variety,
        fpo_id=fpo.id,
        village_origin=village,
        collection_point=collection_point,
        expected_harvest_date=str(date.today() - timedelta(days=days_ago + 10)),
        total_quantity_kg=total_qty,
        status=LotStatus.DRAFT,
        created_by_user_id=created_by.id,
        is_synthetic_demo=True,
    )
    db.add(lot)
    db.flush()
    for farmer, qty in contributors:
        db.add(LotContributor(lot_id=lot.id, farmer_id=farmer.id, quantity_kg=qty))
    _audit(db, created_by, "LOT_CREATED", "Lot", lot.id, new_value={"lot_code": lot.lot_code, "total_quantity_kg": total_qty})
    return lot


def _collect(db, lot, actor):
    lot.status = LotStatus.COLLECTED
    _audit(db, actor, "LOT_COLLECTED", "Lot", lot.id, new_value={"status": "COLLECTED"})


def _screen(db, lot, actor, grade="B", confidence=80.0, flags=None):
    result = run_preliminary_screening(lot.lot_code, lot.total_quantity_kg)
    screening = PreliminaryScreening(
        lot_id=lot.id,
        predicted_grade=grade,
        confidence_score=confidence,
        defect_flags=flags or [],
        model_version=result.model_version,
        disclaimer=result.disclaimer,
    )
    db.add(screening)
    lot.preliminary_grade = grade
    lot.status = LotStatus.UNDER_ASSESSMENT
    _audit(db, actor, "LOT_PRELIMINARY_SCREENED", "Lot", lot.id, new_value={"predicted_grade": grade, "confidence_score": confidence})
    return screening


def _assess(db, lot, assayer_profile, actor_user, final_grade, final_weight_kg, sample_kg=15.0, defects=None, notes=""):
    assessment = QualityAssessment(
        lot_id=lot.id,
        assayer_id=assayer_profile.id,
        sample_quantity_kg=sample_kg,
        final_weight_kg=final_weight_kg,
        final_grade=final_grade,
        visible_defects=defects or [],
        quality_notes=notes,
        is_finalized=True,
        finalized_at=datetime.now(timezone.utc),
    )
    db.add(assessment)
    lot.final_grade = final_grade
    lot.status = LotStatus.ASSESSED
    _audit(db, actor_user, "QUALITY_ASSESSMENT_FINALIZED", "Lot", lot.id, new_value={"final_grade": final_grade.value, "final_weight_kg": final_weight_kg})
    return assessment


def _open_for_offers(db, lot, actor):
    lot.status = LotStatus.OPEN_FOR_OFFERS
    _audit(db, actor, "LOT_OPENED_FOR_OFFERS", "Lot", lot.id, new_value={"status": "OPEN_FOR_OFFERS"})


def _make_offer(db, lot, buyer_profile, buyer_user, *, gross, transport=0.0, loading=0.0, grading=0.0, storage=0.0, platform=0.0, qty=None, grade="B", offer_type=OfferType.NEGOTIABLE, other_deductions=None):
    offer = Offer(
        lot_id=lot.id,
        buyer_id=buyer_profile.id,
        offer_type=offer_type,
        status=OfferStatus.ACTIVE,
        gross_price_per_kg=gross,
        required_quantity_kg=qty or lot.total_quantity_kg,
        required_grade=grade,
        transport_cost_per_kg=transport,
        loading_unloading_per_kg=loading,
        grading_fee_per_kg=grading,
        storage_cost_per_kg=storage,
        platform_fee_per_kg=platform,
        other_deductions=other_deductions or [],
        delivery_terms="FPO-coordinated transport to buyer warehouse",
        payment_timeline_days=7,
        expires_at=datetime.now(timezone.utc) + timedelta(days=5),
    )
    db.add(offer)
    db.flush()
    _audit(db, buyer_user, "OFFER_SUBMITTED", "Offer", offer.id, new_value={"lot_id": lot.id, "gross_price_per_kg": gross})
    return offer


def _net_price(offer) -> float:
    breakdown = DeductionBreakdown(
        offer.transport_cost_per_kg,
        offer.loading_unloading_per_kg,
        offer.grading_fee_per_kg,
        offer.storage_cost_per_kg,
        offer.platform_fee_per_kg,
        offer.other_deductions,
    )
    return compute_net_price_per_kg(offer.gross_price_per_kg, breakdown)


def _accept_offer(db, lot, offer, other_offers, actor):
    offer.status = OfferStatus.ACCEPTED
    for other in other_offers:
        if other.status == OfferStatus.ACTIVE:
            other.status = OfferStatus.REJECTED
    lot.status = LotStatus.OFFER_ACCEPTED
    _audit(db, actor, "OFFER_ACCEPTED", "Offer", offer.id, new_value={"lot_id": lot.id})


def _create_po(db, lot, offer, fpo, actor, *, delivery_location, quantity_kg=None, payment_status=PaymentStatus.PAYMENT_PENDING, po_status=POStatus.ISSUED):
    breakdown = DeductionBreakdown(
        offer.transport_cost_per_kg,
        offer.loading_unloading_per_kg,
        offer.grading_fee_per_kg,
        offer.storage_cost_per_kg,
        offer.platform_fee_per_kg,
        offer.other_deductions,
    )
    net_price = compute_net_price_per_kg(offer.gross_price_per_kg, breakdown)
    qty = quantity_kg or (lot.quality_assessment.final_weight_kg if lot.quality_assessment else lot.total_quantity_kg)

    po = PurchaseOrder(
        po_number=generate_po_number(db),
        lot_id=lot.id,
        offer_id=offer.id,
        buyer_id=offer.buyer_id,
        fpo_id=fpo.id,
        quantity_kg=qty,
        contracted_grade=lot.final_grade.value if lot.final_grade else offer.required_grade,
        gross_price_per_kg=offer.gross_price_per_kg,
        deductions=breakdown.as_dict(),
        net_price_per_kg=net_price,
        tolerance_rules=TOLERANCE_RULES,
        reject_below_grade="C",
        contamination_auto_reject=True,
        delivery_location=delivery_location,
        payment_deadline_days=7,
        inspection_deadline_days=2,
        transport_responsibility="FPO-coordinated",
        storage_responsibility="Buyer, post-delivery",
        status=po_status,
    )
    db.add(po)
    db.flush()
    lot.status = LotStatus.PURCHASE_ORDER_CREATED
    _audit(db, actor, "PURCHASE_ORDER_CREATED", "PurchaseOrder", po.id, new_value={"po_number": po.po_number, "net_price_per_kg": net_price})

    payment = Payment(
        purchase_order_id=po.id,
        lot_id=lot.id,
        buyer_id=po.buyer_id,
        amount_due=round(net_price * qty, 2),
        amount_received=0.0,
        status=payment_status,
    )
    db.add(payment)
    db.flush()
    return po, payment


def _assign_shipment(db, lot, po, transporter_profile, transporter_user, *, vehicle_number, vehicle_type, capacity_kg, driver_contact, pickup_point, status=ShipmentStatus.ASSIGNED, hours_ago=0):
    now = datetime.now(timezone.utc)
    shipment = Shipment(
        lot_id=lot.id,
        purchase_order_id=po.id,
        transporter_id=transporter_profile.id,
        vehicle_number=vehicle_number,
        vehicle_type=vehicle_type,
        capacity_kg=capacity_kg,
        driver_contact=driver_contact,
        pickup_point=pickup_point,
        delivery_point=po.delivery_location,
        estimated_cost=round(capacity_kg * 0.35, 2),
        status=status,
    )
    if status in (ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED):
        shipment.pickup_scheduled_at = now - timedelta(hours=hours_ago + 4)
        shipment.picked_up_at = now - timedelta(hours=hours_ago + 3)
    if status == ShipmentStatus.DELIVERED:
        shipment.delivered_at = now - timedelta(hours=hours_ago)
    db.add(shipment)
    db.flush()
    _audit(db, actor=transporter_user, action="TRANSPORT_ASSIGNED", entity_type="Shipment", entity_id=shipment.id, new_value={"lot_id": lot.id, "vehicle_number": vehicle_number})
    if status != ShipmentStatus.ASSIGNED:
        _audit(db, actor=transporter_user, action="SHIPMENT_STATUS_UPDATED", entity_type="Shipment", entity_id=shipment.id, new_value={"status": status.value})
    if status in (ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT) and lot.status == LotStatus.PURCHASE_ORDER_CREATED:
        lot.status = LotStatus.DISPATCHED
    if status == ShipmentStatus.DELIVERED:
        lot.status = LotStatus.DELIVERED
    return shipment


def _book_storage(db, lot, facility, actor, *, qty, days=10):
    booking = StorageBooking(
        lot_id=lot.id,
        facility_id=facility.id,
        booked_quantity_kg=qty,
        start_date=str(date.today() - timedelta(days=2)),
        end_date=str(date.today() + timedelta(days=days)),
    )
    db.add(booking)
    facility.available_capacity_kg = max(0.0, facility.available_capacity_kg - qty)
    db.flush()
    _audit(db, actor, "STORAGE_BOOKED", "StorageBooking", lot.id, new_value={"facility_id": facility.id, "booked_quantity_kg": qty})
    return booking


def _sensor_events(db, facility, booking, *, count=6, base_temp=27.0, base_humidity=67.0, alert_at=None):
    for i in range(count):
        status = SensorStatus.NORMAL
        temp = base_temp + i * 0.3
        humidity = base_humidity + i * 0.4
        if alert_at is not None and i >= alert_at:
            status = SensorStatus.WARNING if i < count - 1 else SensorStatus.ALERT
            temp += 4.5
            humidity += 6.0
        db.add(
            StorageEvent(
                facility_id=facility.id,
                booking_id=booking.id if booking else None,
                temperature_celsius=round(temp, 1),
                humidity_percent=round(humidity, 1),
                occupancy_percent=round(50 + i * 1.5, 1),
                status=status,
                recorded_at=datetime.now(timezone.utc) - timedelta(hours=count - i),
            )
        )


def _confirm_delivery(db, lot, po, payment, actor, *, delivered_grade="B", contamination=False):
    outcome = resolve_tolerance_pricing(
        contracted_grade=po.contracted_grade,
        delivered_grade=delivered_grade,
        contracted_net_price_per_kg=po.net_price_per_kg,
        tolerance_rules=po.tolerance_rules,
        reject_below_grade=po.reject_below_grade,
        contamination_flagged=contamination,
        contamination_auto_reject=po.contamination_auto_reject,
    )
    if lot.status in (LotStatus.DISPATCHED, LotStatus.PURCHASE_ORDER_CREATED):
        lot.status = LotStatus.DELIVERED
    po.status = POStatus.FULFILLED
    if outcome.outcome in ("ACCEPTED_FULL", "ACCEPTED_STEP_DOWN"):
        payment.amount_due = round(outcome.applicable_price_per_kg * po.quantity_kg, 2)
        if payment.status == PaymentStatus.PAYMENT_PENDING:
            payment.status = PaymentStatus.DELIVERED
    _audit(db, actor, "DELIVERY_CONFIRMED", "PurchaseOrder", po.id, new_value={"delivered_grade": delivered_grade, "outcome": outcome.outcome})
    return outcome


def _initiate_payment(db, payment, actor, days_ago=1):
    payment.status = PaymentStatus.PAYMENT_INITIATED
    payment.transaction_reference = generate_transaction_reference()
    payment.initiated_at = datetime.now(timezone.utc) - timedelta(days=days_ago)
    _audit(db, actor, "PAYMENT_INITIATED", "Payment", payment.id, new_value={"transaction_reference": payment.transaction_reference})


def _pay(db, payment, actor, amount):
    payment.amount_received = round(payment.amount_received + amount, 2)
    if payment.amount_received >= payment.amount_due - 0.01:
        payment.status = PaymentStatus.PAYMENT_COMPLETED
        payment.completed_at = datetime.now(timezone.utc)
    else:
        payment.status = PaymentStatus.PARTIALLY_PAID
    _audit(db, actor, "PAYMENT_RECEIVED", "Payment", payment.id, new_value={"amount": amount, "status": payment.status.value})


def _settle(db, lot, payment, contributors, actor):
    settlement = Settlement(
        lot_id=lot.id,
        payment_id=payment.id,
        total_amount=payment.amount_received,
        status=(SettlementStatus.COMPLETED if payment.status == PaymentStatus.PAYMENT_COMPLETED else SettlementStatus.PARTIAL),
    )
    db.add(settlement)
    db.flush()
    lines = compute_settlement_items(
        contributors=[ContributorShare(farmer.id, qty) for farmer, qty in contributors],
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
                transaction_reference=f"TXN-DEMO-SETL-{settlement.id}-{line.farmer_id}",
            )
        )
    if lot.status == LotStatus.DELIVERED:
        lot.status = LotStatus.SETTLED
    _audit(db, actor, "SETTLEMENT_INITIATED", "Settlement", settlement.id, new_value={"lot_id": lot.id, "total_amount": payment.amount_received})
    return settlement


def _raise_dispute(db, lot, po, raised_by_user, reason, *, status=DisputeStatus.OPEN):
    dispute = Dispute(
        dispute_code=generate_dispute_code(db),
        lot_id=lot.id,
        purchase_order_id=po.id if po else None,
        raised_by_user_id=raised_by_user.id,
        reason=reason,
        status=status,
    )
    db.add(dispute)
    db.flush()
    if lot.status in (LotStatus.PURCHASE_ORDER_CREATED, LotStatus.DISPATCHED, LotStatus.DELIVERED, LotStatus.SETTLED):
        lot.pre_dispute_status = lot.status
        lot.status = LotStatus.DISPUTED
    _audit(db, raised_by_user, "DISPUTE_OPENED", "Dispute", dispute.id, new_value={"lot_id": lot.id})
    return dispute


def _resolve_dispute(db, dispute, lot, settlement, resolver, *, decision, adjustment=None, status=DisputeStatus.RESOLVED):
    dispute.status = status
    dispute.final_decision = decision
    dispute.financial_adjustment = adjustment
    dispute.resolved_by_user_id = resolver.id
    dispute.resolved_at = datetime.now(timezone.utc)

    if lot.status == LotStatus.DISPUTED and lot.pre_dispute_status:
        lot.status = lot.pre_dispute_status
        lot.pre_dispute_status = None

    if adjustment and settlement:
        settlement.total_amount = round(settlement.total_amount + adjustment, 2)
        settlement.other_deductions = [*settlement.other_deductions, {"label": f"Dispute {dispute.dispute_code} adjustment", "amount": adjustment}]
        settlement.status = SettlementStatus.DISPUTED
        db.flush()
        lines = compute_settlement_items(
            contributors=[ContributorShare(item.farmer_id, item.contributed_quantity_kg) for item in settlement.items],
            total_amount=settlement.total_amount,
        )
        by_farmer = {line.farmer_id: line for line in lines}
        for item in settlement.items:
            line = by_farmer[item.farmer_id]
            item.gross_share_amount = line.gross_share_amount
            item.deduction_amount = line.deduction_amount
            item.net_amount = line.net_amount

    _audit(db, resolver, "DISPUTE_RESOLVED", "Dispute", dispute.id, new_value={"status": status.value, "financial_adjustment": adjustment})


# =============================================================================


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == "admin@annadata.demo").first():
            print("Demo data already present — skipping seed. Use reset_demo.py to reseed.")
            return

        print("Seeding AnnData demo data (SYNTHETIC — Niphad-Lasalgaon onion pilot)...")

        # --- Commodity -------------------------------------------------------
        onion = Commodity(
            name="Onion",
            variety="Nashik Red N-53",
            unit="kg",
            storage_guidelines={
                "ideal_temp_c": [25, 30],
                "warning_temp_c": [20, 33],
                "ideal_humidity_pct": [65, 70],
                "warning_humidity_pct": [55, 75],
                "notes": "Onions require dry, well-ventilated storage rather than cold-chain refrigeration (NHRDF guidance).",
            },
        )
        db.add(onion)
        db.flush()

        # --- FPOs (two collection centres, two talukas) -----------------------
        fpo = FPOOrganization(
            name="Niphad Onion Farmer Producer Organization",
            registration_number="FPO-DEMO-NASHIK-001",
            village="Niphad",
            district="Nashik",
            state="Maharashtra",
            is_synthetic_demo=True,
        )
        fpo2 = FPOOrganization(
            name="Yeola Krishi Utpadak Company",
            registration_number="FPO-DEMO-NASHIK-002",
            village="Yeola",
            district="Nashik",
            state="Maharashtra",
            is_synthetic_demo=True,
        )
        db.add_all([fpo, fpo2])
        db.flush()

        # --- Admin -------------------------------------------------------
        admin_user = _user(db, "admin@annadata.demo", "AnnData Platform Admin", UserRole.ADMIN, "9990000001")

        # --- FPO agents ------------------------------------------------------
        fpo_user = _user(db, "fpo@annadata.demo", "Sunita Deshmukh (FPO Agent)", UserRole.FPO_AGENT, "9990000002", "mr")
        db.add(FPOAgentProfile(user_id=fpo_user.id, fpo_id=fpo.id, designation="Collection Centre Agent"))

        fpo2_user = _user(db, "fpo2@annadata.demo", "Anil Bornare (FPO Agent)", UserRole.FPO_AGENT, "9990000003", "mr")
        db.add(FPOAgentProfile(user_id=fpo2_user.id, fpo_id=fpo2.id, designation="Collection Centre Agent"))
        db.flush()

        # --- Farmers (SYNTHETIC DEMO RECORDS) ---------------------------------
        # FPO 1 — Niphad taluka villages (Lasalgaon, Niphad, Pimpalgaon Baswant,
        # Khede, Datyane, Vinchur, Bhendali, Shivadi are real villages in Niphad
        # taluka — see research/geography-and-villages.md).
        fpo1_farmer_defs = [
            ("farmer@annadata.demo", "Kavita Shinde", "9990000101", "Niphad", 2.5),
            ("ganesh.patil@annadata.demo", "Ganesh Patil", "9990000102", "Niphad", 4.0),
            ("rajendra.jadhav@annadata.demo", "Rajendra Jadhav", "9990000103", "Niphad", 5.5),
            ("sunita.pawar@annadata.demo", "Sunita Pawar", "9990000104", "Lasalgaon", 3.0),
            ("vitthal.gaikwad@annadata.demo", "Vitthal Gaikwad", "9990000105", "Niphad", 5.5),
            ("anita.kadam@annadata.demo", "Anita Kadam", "9990000106", "Pimpalgaon Baswant", 2.0),
            ("shivaji.kale@annadata.demo", "Shivaji Kale", "9990000107", "Khede", 4.0),
            ("meera.bhosale@annadata.demo", "Meera Bhosale", "9990000108", "Datyane", 3.5),
            ("prakash.sonawane@annadata.demo", "Prakash Sonawane", "9990000109", "Vinchur", 6.0),
            ("lata.wagh@annadata.demo", "Lata Wagh", "9990000110", "Bhendali", 2.5),
            ("dilip.chavan@annadata.demo", "Dilip Chavan", "9990000111", "Shivadi", 4.5),
            ("sarika.thorat@annadata.demo", "Sarika Thorat", "9990000112", "Lasalgaon", 3.2),
            ("bhausaheb.gite@annadata.demo", "Bhausaheb Gite", "9990000113", "Niphad", 5.0),
        ]
        # FPO 2 — Yeola taluka + neighboring onion-growing talukas (Chandwad,
        # Dindori — also real, per research/geography-and-villages.md).
        fpo2_farmer_defs = [
            ("kalpana.salunkhe@annadata.demo", "Kalpana Salunkhe", "9990000114", "Yeola", 3.8),
            ("ramesh.aher@annadata.demo", "Ramesh Aher", "9990000115", "Yeola", 4.2),
            ("pushpa.bhagat@annadata.demo", "Pushpa Bhagat", "9990000116", "Chandwad", 2.8),
            ("nivrutti.shelke@annadata.demo", "Nivrutti Shelke", "9990000117", "Dindori", 5.8),
            ("yamuna.kolhe@annadata.demo", "Yamuna Kolhe", "9990000118", "Yeola", 3.0),
        ]

        def _make_farmers(defs, target_fpo):
            out = {}
            for email, name, phone, village, land in defs:
                u = _user(db, email, name, UserRole.FARMER, phone, "mr")
                profile = FarmerProfile(
                    user_id=u.id,
                    fpo_id=target_fpo.id,
                    village=village,
                    taluka=target_fpo.village,
                    district="Nashik",
                    state="Maharashtra",
                    land_area_acres=land,
                )
                db.add(profile)
                db.flush()
                out[name] = profile
            return out

        f1 = _make_farmers(fpo1_farmer_defs, fpo)
        f2 = _make_farmers(fpo2_farmer_defs, fpo2)

        # --- Buyers (SYNTHETIC DEMO RECORDS) ----------------------------------
        buyer_defs = [
            ("buyer@annadata.demo", "Nashik Food Processing Unit", BuyerType.PROCESSOR, "27ABCDE1234F1Z5", VerificationStatus.VERIFIED),
            ("buyer2@annadata.demo", "Maharashtra Retail Procurement Network", BuyerType.RETAILER, "27ABCDE5678F1Z2", VerificationStatus.VERIFIED),
            ("buyer3@annadata.demo", "Regional Onion Wholesaler", BuyerType.WHOLESALER, "27ABCDE9999F1Z9", VerificationStatus.VERIFIED),
            ("buyer4@annadata.demo", "Konkan Fresh Exports", BuyerType.EXPORTER, "27ABCDE4321F1Z8", VerificationStatus.VERIFIED),
            ("buyer5@annadata.demo", "Deccan Agri Traders", BuyerType.WHOLESALER, "27ABCDE1111F1Z3", VerificationStatus.PENDING),
            ("buyer6@annadata.demo", "Sahyadri Retail Chain", BuyerType.RETAILER, "27ABCDE2222F1Z7", VerificationStatus.UNVERIFIED),
        ]
        buyers: dict[str, BuyerProfile] = {}
        buyer_users: dict[str, User] = {}
        for email, org, btype, gstin, verification in buyer_defs:
            u = _user(db, email, f"{org} (Procurement Desk)", UserRole.BUYER, "9990000201")
            profile = BuyerProfile(
                user_id=u.id,
                organization_name=org,
                buyer_type=btype,
                gstin=gstin,
                address="MIDC Industrial Area, Nashik, Maharashtra",
                verification_status=verification,
            )
            db.add(profile)
            db.flush()
            buyers[org] = profile
            buyer_users[org] = u

        # --- Assayers ----------------------------------------------------------
        assayer_user = _user(db, "assayer@annadata.demo", "Assayer A", UserRole.ASSAYER, "9990000301")
        assayer = AssayerProfile(user_id=assayer_user.id, certification_id="ASSAY-CERT-DEMO-01", affiliated_fpo_id=fpo.id)
        db.add(assayer)
        assayer2_user = _user(db, "assayer2@annadata.demo", "Assayer B", UserRole.ASSAYER, "9990000302")
        assayer2 = AssayerProfile(user_id=assayer2_user.id, certification_id="ASSAY-CERT-DEMO-02", affiliated_fpo_id=fpo2.id)
        db.add(assayer2)
        db.flush()

        # --- Transporters --------------------------------------------------
        transporter_user = _user(db, "transporter@annadata.demo", "Nashik Agri Logistics (Dispatch)", UserRole.TRANSPORTER, "9990000401")
        transporter = TransporterProfile(user_id=transporter_user.id, company_name="Nashik Agri Logistics", contact_phone="9990000401")
        db.add(transporter)
        transporter2_user = _user(db, "transporter2@annadata.demo", "Lasalgaon Carriers (Dispatch)", UserRole.TRANSPORTER, "9990000402")
        transporter2 = TransporterProfile(user_id=transporter2_user.id, company_name="Lasalgaon Carriers", contact_phone="9990000402")
        db.add(transporter2)
        db.flush()

        # --- Storage facilities ------------------------------------------------
        storage_facility = StorageFacility(
            name="Niphad Onion Storage Centre",
            operator_name="Niphad Warehousing Cooperative (third-party, coordinated only)",
            village="Niphad", district="Nashik", state="Maharashtra",
            latitude=20.0859, longitude=74.1109,
            total_capacity_kg=50000, available_capacity_kg=48000,
            ventilation_type="Naturally ventilated onion chawl",
            tariff_per_kg_per_day=0.05,
            commodity_compatibility=["Onion", "Garlic"],
            insurance_provider="AgriSure Warehousing Insurance (demo)",
            liability_notes="Facility operator holds liability up to insured value; AnnData does not own this facility.",
            last_inspection_date=str(date.today() - timedelta(days=20)),
            incident_status="NONE",
            is_synthetic_demo=True,
        )
        storage_facility2 = StorageFacility(
            name="Lasalgaon APMC Warehousing Yard",
            operator_name="Lasalgaon APMC Warehousing Trust (third-party, coordinated only)",
            village="Lasalgaon", district="Nashik", state="Maharashtra",
            latitude=20.1464, longitude=74.2389,
            total_capacity_kg=80000, available_capacity_kg=76500,
            ventilation_type="Bottom and side-ventilated two-row chawl",
            tariff_per_kg_per_day=0.06,
            commodity_compatibility=["Onion"],
            insurance_provider="AgriSure Warehousing Insurance (demo)",
            liability_notes="Facility operator holds liability up to insured value; AnnData does not own this facility.",
            last_inspection_date=str(date.today() - timedelta(days=12)),
            incident_status="NONE",
            is_synthetic_demo=True,
        )
        storage_facility3 = StorageFacility(
            name="Yeola Cooperative Storage Shed",
            operator_name="Yeola Farmers Cooperative (third-party, coordinated only)",
            village="Yeola", district="Nashik", state="Maharashtra",
            latitude=20.0432, longitude=74.4886,
            total_capacity_kg=30000, available_capacity_kg=29200,
            ventilation_type="Naturally ventilated onion chawl",
            tariff_per_kg_per_day=0.045,
            commodity_compatibility=["Onion"],
            insurance_provider=None,
            liability_notes="Facility operator holds liability up to insured value; AnnData does not own this facility.",
            last_inspection_date=str(date.today() - timedelta(days=35)),
            incident_status="NONE",
            is_synthetic_demo=True,
        )
        db.add_all([storage_facility, storage_facility2, storage_facility3])
        db.flush()

        print("Reference data created (2 FPOs, 18 farmers, 6 buyers, 2 assayers, 2 transporters, 3 storage facilities).")
        print("Building the full demo transaction (LOT-2026-0001)...")

        # =====================================================================
        # LOT-2026-0001 — the flagship, fully documented demo transaction
        # (README.md / docs/workflow.md walk through this exact lot).
        # =====================================================================
        flagship_contributors = [(f1["Kavita Shinde"], 420.0), (f1["Ganesh Patil"], 680.0), (f1["Rajendra Jadhav"], 900.0)]
        lot = _new_lot(
            db, fpo=fpo, commodity=onion, contributors=flagship_contributors,
            village="Niphad", collection_point="Niphad Collection Centre",
            variety="Nashik Red N-53", created_by=fpo_user, days_ago=15,
        )
        _collect(db, lot, fpo_user)
        _screen(db, lot, fpo_user, grade="B", confidence=82.0, flags=["minor visible defects", "surface damage"])
        _assess(
            db, lot, assayer, assayer_user, Grade.B, 1980.0, sample_kg=20.0,
            defects=["minor surface blemish on ~8% of sample"],
            notes="Bulbs well-cured and dry. Minor surface blemishes within acceptable range for Grade B.",
        )
        _open_for_offers(db, lot, fpo_user)

        offer_a = _make_offer(db, lot, buyers["Nashik Food Processing Unit"], buyer_users["Nashik Food Processing Unit"], gross=30.0, transport=2.0, loading=0.75, grading=0.5, storage=0.5, platform=0.25, qty=1980.0, grade="B")
        offer_b = _make_offer(db, lot, buyers["Maharashtra Retail Procurement Network"], buyer_users["Maharashtra Retail Procurement Network"], gross=29.0, transport=0.75, loading=0.4, grading=0.25, storage=0.1, qty=1980.0, grade="B")
        net_a, net_b = _net_price(offer_a), _net_price(offer_b)
        assert net_a == 26.0 and net_b == 27.5, f"Unexpected net prices: {net_a}, {net_b}"

        _accept_offer(db, lot, offer_b, [offer_a], fpo_user)
        po, payment = _create_po(db, lot, offer_b, fpo, fpo_user, delivery_location="Maharashtra Retail Procurement Network Warehouse, Nashik MIDC", quantity_kg=1980.0, po_status=POStatus.FULFILLED)

        _assign_shipment(db, lot, po, transporter, transporter_user, vehicle_number="MH-15-BT-4521", vehicle_type="Open truck, 5 tonne", capacity_kg=5000, driver_contact="9990000499", pickup_point="Niphad Collection Centre", status=ShipmentStatus.DELIVERED, hours_ago=24)

        _confirm_delivery(db, lot, po, payment, admin_user, delivered_grade="B")
        _initiate_payment(db, payment, buyer_users["Maharashtra Retail Procurement Network"], days_ago=1)
        _pay(db, payment, buyer_users["Maharashtra Retail Procurement Network"], payment.amount_due)

        booking = _book_storage(db, lot, storage_facility, fpo_user, qty=500.0, days=7)
        _sensor_events(db, storage_facility, booking, count=6, alert_at=5)

        settlement = _settle(db, lot, payment, flagship_contributors, fpo_user)

        dispute = _raise_dispute(
            db, lot, po, buyer_users["Maharashtra Retail Procurement Network"],
            "A small number of bags in the delivered lot showed sprouting beyond the sample checked at assessment.",
            status=DisputeStatus.RESOLVED,
        )
        db.add(DisputeEvidence(dispute_id=dispute.id, evidence_type="NOTE", description="Buyer-submitted photos showing sprouting on a sub-sample of delivered bags (referenced offline for this demo record).", uploaded_by_user_id=buyer_users["Maharashtra Retail Procurement Network"].id))
        dispute.proposed_resolution = "Partial price adjustment for the affected bags instead of full lot rejection."
        _resolve_dispute(
            db, dispute, lot, settlement, fpo_user,
            decision="Reviewed assessment photos, delivery timestamp and buyer-submitted evidence. Affected quantity confirmed at ~45kg of 1980kg (2.3%), within acceptable tolerance for a documented partial adjustment rather than lot rejection.",
            adjustment=-450.0,
        )

        db.commit()
        print(f"  {lot.lot_code}: {lot.status.value} (flagship — 2,000kg, resolved dispute)")

        # =====================================================================
        # 15 additional lots spanning every remaining workflow state, so the
        # marketplace, dashboards, analytics and every list view have
        # substantial, varied data rather than a single example.
        # =====================================================================

        # --- LOT-0002, 0003: DRAFT ---------------------------------------------
        _new_lot(db, fpo=fpo, commodity=onion, contributors=[(f1["Sunita Pawar"], 380.0), (f1["Vitthal Gaikwad"], 720.0)], village="Lasalgaon", collection_point="Lasalgaon Sub-Centre", variety="Bhima Super", created_by=fpo_user, days_ago=1)
        _new_lot(db, fpo=fpo2, commodity=onion, contributors=[(f2["Kalpana Salunkhe"], 500.0), (f2["Ramesh Aher"], 545.0)], village="Yeola", collection_point="Yeola Collection Centre", variety="Agrifound Dark Red", created_by=fpo2_user, days_ago=1)

        # --- LOT-0004: COLLECTED -------------------------------------------------
        lot4 = _new_lot(db, fpo=fpo, commodity=onion, contributors=[(f1["Anita Kadam"], 310.0), (f1["Shivaji Kale"], 560.0)], village="Pimpalgaon Baswant", collection_point="Pimpalgaon Baswant Collection Point", variety="Nashik Red N-53", created_by=fpo_user, days_ago=3)
        _collect(db, lot4, fpo_user)

        # --- LOT-0005: UNDER_ASSESSMENT ------------------------------------------
        lot5 = _new_lot(db, fpo=fpo, commodity=onion, contributors=[(f1["Meera Bhosale"], 470.0), (f1["Prakash Sonawane"], 810.0)], village="Datyane", collection_point="Datyane Collection Point", variety="Lasalgaon Red (GI)", created_by=fpo_user, days_ago=4)
        _collect(db, lot5, fpo_user)
        _screen(db, lot5, fpo_user, grade="B", confidence=77.5, flags=["size variation"])

        # --- LOT-0006: ASSESSED --------------------------------------------------
        lot6 = _new_lot(db, fpo=fpo, commodity=onion, contributors=[(f1["Lata Wagh"], 340.0), (f1["Dilip Chavan"], 610.0)], village="Bhendali", collection_point="Bhendali Collection Point", variety="Bhima Super", created_by=fpo_user, days_ago=5)
        _collect(db, lot6, fpo_user)
        _screen(db, lot6, fpo_user, grade="A", confidence=88.0)
        _assess(db, lot6, assayer, assayer_user, Grade.A, 935.0, sample_kg=12.0, notes="Uniform bulb size, well cured.")

        # --- LOT-0007: OPEN_FOR_OFFERS — three competing offers -----------------
        lot7 = _new_lot(db, fpo=fpo, commodity=onion, contributors=[(f1["Sarika Thorat"], 405.0), (f1["Bhausaheb Gite"], 690.0)], village="Lasalgaon", collection_point="Lasalgaon Sub-Centre", variety="Nashik Red N-53", created_by=fpo_user, days_ago=6)
        _collect(db, lot7, fpo_user)
        _screen(db, lot7, fpo_user, grade="B", confidence=81.0)
        _assess(db, lot7, assayer, assayer_user, Grade.B, 1080.0, sample_kg=14.0, notes="Acceptable moisture level; minor size variation.")
        _open_for_offers(db, lot7, fpo_user)
        _make_offer(db, lot7, buyers["Nashik Food Processing Unit"], buyer_users["Nashik Food Processing Unit"], gross=27.0, transport=3.5, loading=0.6, grading=0.4, qty=1080.0, grade="B")
        _make_offer(db, lot7, buyers["Regional Onion Wholesaler"], buyer_users["Regional Onion Wholesaler"], gross=25.5, transport=1.0, loading=0.3, qty=1080.0, grade="B")
        _make_offer(db, lot7, buyers["Konkan Fresh Exports"], buyer_users["Konkan Fresh Exports"], gross=29.5, transport=4.2, loading=0.8, grading=0.5, platform=0.3, qty=1080.0, grade="B", offer_type=OfferType.PURCHASE_ORDER)

        # --- LOT-0008: OPEN_FOR_OFFERS — two offers, FPO2 -----------------------
        lot8 = _new_lot(db, fpo=fpo2, commodity=onion, contributors=[(f2["Pushpa Bhagat"], 360.0), (f2["Nivrutti Shelke"], 760.0)], village="Chandwad", collection_point="Yeola Collection Centre", variety="Agrifound Dark Red", created_by=fpo2_user, days_ago=6)
        _collect(db, lot8, fpo2_user)
        _screen(db, lot8, fpo2_user, grade="A", confidence=85.0)
        _assess(db, lot8, assayer2, assayer2_user, Grade.A, 1105.0, sample_kg=13.0, notes="Excellent bulb uniformity and dry outer skin.")
        _open_for_offers(db, lot8, fpo2_user)
        _make_offer(db, lot8, buyers["Regional Onion Wholesaler"], buyer_users["Regional Onion Wholesaler"], gross=24.0, transport=4.0, loading=0.5, qty=1105.0, grade="A")
        _make_offer(db, lot8, buyers["Konkan Fresh Exports"], buyer_users["Konkan Fresh Exports"], gross=23.0, transport=1.0, loading=0.2, qty=1105.0, grade="A")

        # --- LOT-0009: OFFER_ACCEPTED (single-farmer lot, FPO2) -----------------
        lot9 = _new_lot(db, fpo=fpo2, commodity=onion, contributors=[(f2["Yamuna Kolhe"], 400.0)], village="Yeola", collection_point="Yeola Collection Centre", variety="Agrifound Dark Red", created_by=fpo2_user, days_ago=7)
        _collect(db, lot9, fpo2_user)
        _screen(db, lot9, fpo2_user, grade="B", confidence=74.0)
        _assess(db, lot9, assayer2, assayer2_user, Grade.B, 392.0, sample_kg=8.0)
        _open_for_offers(db, lot9, fpo2_user)
        o9 = _make_offer(db, lot9, buyers["Maharashtra Retail Procurement Network"], buyer_users["Maharashtra Retail Procurement Network"], gross=25.0, transport=1.5, loading=0.3, qty=392.0, grade="B")
        _accept_offer(db, lot9, o9, [], fpo2_user)

        # --- LOT-0010: PURCHASE_ORDER_CREATED ------------------------------------
        lot10 = _new_lot(db, fpo=fpo, commodity=onion, contributors=[(f1["Kavita Shinde"], 300.0), (f1["Ganesh Patil"], 400.0)], village="Niphad", collection_point="Niphad Collection Centre", variety="Nashik Red N-53", created_by=fpo_user, days_ago=8)
        _collect(db, lot10, fpo_user)
        _screen(db, lot10, fpo_user, grade="A", confidence=86.0)
        _assess(db, lot10, assayer, assayer_user, Grade.A, 690.0, sample_kg=10.0)
        _open_for_offers(db, lot10, fpo_user)
        o10 = _make_offer(db, lot10, buyers["Nashik Food Processing Unit"], buyer_users["Nashik Food Processing Unit"], gross=26.0, transport=1.2, loading=0.4, qty=690.0, grade="A")
        _accept_offer(db, lot10, o10, [], fpo_user)
        _create_po(db, lot10, o10, fpo, fpo_user, delivery_location="Nashik Food Processing Unit, MIDC Ambad, Nashik", quantity_kg=690.0)

        # --- LOT-0011: DISPATCHED (with a WARNING/ALERT storage event) ----------
        lot11 = _new_lot(db, fpo=fpo, commodity=onion, contributors=[(f1["Rajendra Jadhav"], 500.0), (f1["Sunita Pawar"], 300.0)], village="Niphad", collection_point="Niphad Collection Centre", variety="Nashik Red N-53", created_by=fpo_user, days_ago=9)
        _collect(db, lot11, fpo_user)
        _screen(db, lot11, fpo_user, grade="B", confidence=79.0)
        _assess(db, lot11, assayer, assayer_user, Grade.B, 780.0, sample_kg=12.0)
        _open_for_offers(db, lot11, fpo_user)
        o11 = _make_offer(db, lot11, buyers["Regional Onion Wholesaler"], buyer_users["Regional Onion Wholesaler"], gross=24.5, transport=1.0, loading=0.3, qty=780.0, grade="B")
        _accept_offer(db, lot11, o11, [], fpo_user)
        po11, payment11 = _create_po(db, lot11, o11, fpo, fpo_user, delivery_location="Regional Onion Wholesaler Yard, Panchavati, Nashik", quantity_kg=780.0, payment_status=PaymentStatus.DISPATCHED)
        _assign_shipment(db, lot11, po11, transporter2, transporter2_user, vehicle_number="MH-15-CT-7812", vehicle_type="Covered tempo, 3 tonne", capacity_kg=3000, driver_contact="9990000498", pickup_point="Niphad Collection Centre", status=ShipmentStatus.IN_TRANSIT, hours_ago=2)
        booking11 = _book_storage(db, lot11, storage_facility2, fpo_user, qty=780.0, days=5)
        _sensor_events(db, storage_facility2, booking11, count=8, base_temp=26.5, base_humidity=66.0, alert_at=6)

        # --- LOT-0012: DELIVERED, payment PARTIALLY_PAID -------------------------
        lot12 = _new_lot(db, fpo=fpo, commodity=onion, contributors=[(f1["Vitthal Gaikwad"], 400.0), (f1["Anita Kadam"], 310.0)], village="Niphad", collection_point="Niphad Collection Centre", variety="Nashik Red N-53", created_by=fpo_user, days_ago=11)
        _collect(db, lot12, fpo_user)
        _screen(db, lot12, fpo_user, grade="A", confidence=90.0)
        _assess(db, lot12, assayer, assayer_user, Grade.A, 700.0, sample_kg=10.0)
        _open_for_offers(db, lot12, fpo_user)
        o12 = _make_offer(db, lot12, buyers["Nashik Food Processing Unit"], buyer_users["Nashik Food Processing Unit"], gross=27.5, transport=1.3, loading=0.35, qty=700.0, grade="A")
        _accept_offer(db, lot12, o12, [], fpo_user)
        po12, payment12 = _create_po(db, lot12, o12, fpo, fpo_user, delivery_location="Nashik Food Processing Unit, MIDC Ambad, Nashik", quantity_kg=700.0)
        _assign_shipment(db, lot12, po12, transporter, transporter_user, vehicle_number="MH-15-BT-3390", vehicle_type="Open truck, 3 tonne", capacity_kg=3000, driver_contact="9990000499", pickup_point="Niphad Collection Centre", status=ShipmentStatus.DELIVERED, hours_ago=20)
        _confirm_delivery(db, lot12, po12, payment12, admin_user, delivered_grade="A")
        _initiate_payment(db, payment12, buyer_users["Nashik Food Processing Unit"], days_ago=2)
        _pay(db, payment12, buyer_users["Nashik Food Processing Unit"], round(payment12.amount_due * 0.45, 2))

        # --- LOT-0013: SETTLED (3 contributing farmers) ---------------------------
        lot13 = _new_lot(db, fpo=fpo, commodity=onion, contributors=[(f1["Shivaji Kale"], 560.0), (f1["Meera Bhosale"], 470.0), (f1["Prakash Sonawane"], 300.0)], village="Khede", collection_point="Khede Collection Point", variety="Lasalgaon Red (GI)", created_by=fpo_user, days_ago=18)
        _collect(db, lot13, fpo_user)
        _screen(db, lot13, fpo_user, grade="B", confidence=80.0)
        _assess(db, lot13, assayer, assayer_user, Grade.B, 1310.0, sample_kg=16.0)
        _open_for_offers(db, lot13, fpo_user)
        o13 = _make_offer(db, lot13, buyers["Maharashtra Retail Procurement Network"], buyer_users["Maharashtra Retail Procurement Network"], gross=25.0, transport=1.1, loading=0.35, storage=0.2, qty=1310.0, grade="B")
        _accept_offer(db, lot13, o13, [], fpo_user)
        po13, payment13 = _create_po(db, lot13, o13, fpo, fpo_user, delivery_location="Maharashtra Retail Procurement Network Warehouse, Nashik MIDC", quantity_kg=1310.0, po_status=POStatus.FULFILLED)
        _assign_shipment(db, lot13, po13, transporter, transporter_user, vehicle_number="MH-15-BT-6620", vehicle_type="Open truck, 5 tonne", capacity_kg=5000, driver_contact="9990000499", pickup_point="Khede Collection Point", status=ShipmentStatus.DELIVERED, hours_ago=96)
        _confirm_delivery(db, lot13, po13, payment13, admin_user, delivered_grade="B")
        _initiate_payment(db, payment13, buyer_users["Maharashtra Retail Procurement Network"], days_ago=5)
        _pay(db, payment13, buyer_users["Maharashtra Retail Procurement Network"], payment13.amount_due)
        _settle(db, lot13, payment13, [(f1["Shivaji Kale"], 560.0), (f1["Meera Bhosale"], 470.0), (f1["Prakash Sonawane"], 300.0)], fpo_user)

        # --- LOT-0014: SETTLED, FPO2, premium export price ------------------------
        lot14 = _new_lot(db, fpo=fpo2, commodity=onion, contributors=[(f2["Kalpana Salunkhe"], 500.0), (f2["Ramesh Aher"], 545.0)], village="Yeola", collection_point="Yeola Collection Centre", variety="Agrifound Dark Red", created_by=fpo2_user, days_ago=20)
        _collect(db, lot14, fpo2_user)
        _screen(db, lot14, fpo2_user, grade="A", confidence=89.0)
        _assess(db, lot14, assayer2, assayer2_user, Grade.A, 1030.0, sample_kg=14.0, notes="Export-quality bulbs, minimal blemish.")
        _open_for_offers(db, lot14, fpo2_user)
        o14 = _make_offer(db, lot14, buyers["Konkan Fresh Exports"], buyer_users["Konkan Fresh Exports"], gross=28.0, transport=1.5, loading=0.3, grading=0.2, qty=1030.0, grade="A", offer_type=OfferType.PURCHASE_ORDER)
        _accept_offer(db, lot14, o14, [], fpo2_user)
        po14, payment14 = _create_po(db, lot14, o14, fpo2, fpo2_user, delivery_location="Konkan Fresh Exports Packhouse, JNPT Road, Navi Mumbai", quantity_kg=1030.0, po_status=POStatus.FULFILLED)
        _assign_shipment(db, lot14, po14, transporter2, transporter2_user, vehicle_number="MH-15-CT-9021", vehicle_type="Refrigerated-capable tempo, 5 tonne", capacity_kg=5000, driver_contact="9990000498", pickup_point="Yeola Collection Centre", status=ShipmentStatus.DELIVERED, hours_ago=72)
        _confirm_delivery(db, lot14, po14, payment14, admin_user, delivered_grade="A")
        _initiate_payment(db, payment14, buyer_users["Konkan Fresh Exports"], days_ago=4)
        _pay(db, payment14, buyer_users["Konkan Fresh Exports"], payment14.amount_due)
        _settle(db, lot14, payment14, [(f2["Kalpana Salunkhe"], 500.0), (f2["Ramesh Aher"], 545.0)], fpo2_user)

        # --- LOT-0015: DISPUTED — a live, unresolved dispute ----------------------
        lot15 = _new_lot(db, fpo=fpo, commodity=onion, contributors=[(f1["Lata Wagh"], 340.0), (f1["Dilip Chavan"], 610.0)], village="Bhendali", collection_point="Bhendali Collection Point", variety="Bhima Super", created_by=fpo_user, days_ago=22)
        _collect(db, lot15, fpo_user)
        _screen(db, lot15, fpo_user, grade="B", confidence=76.0)
        _assess(db, lot15, assayer, assayer_user, Grade.B, 935.0, sample_kg=12.0)
        _open_for_offers(db, lot15, fpo_user)
        o15 = _make_offer(db, lot15, buyers["Nashik Food Processing Unit"], buyer_users["Nashik Food Processing Unit"], gross=25.5, transport=1.4, loading=0.3, qty=935.0, grade="B")
        _accept_offer(db, lot15, o15, [], fpo_user)
        po15, payment15 = _create_po(db, lot15, o15, fpo, fpo_user, delivery_location="Nashik Food Processing Unit, MIDC Ambad, Nashik", quantity_kg=935.0, po_status=POStatus.FULFILLED)
        _assign_shipment(db, lot15, po15, transporter, transporter_user, vehicle_number="MH-15-BT-1150", vehicle_type="Open truck, 3 tonne", capacity_kg=3000, driver_contact="9990000499", pickup_point="Bhendali Collection Point", status=ShipmentStatus.DELIVERED, hours_ago=48)
        _confirm_delivery(db, lot15, po15, payment15, admin_user, delivered_grade="B")
        _initiate_payment(db, payment15, buyer_users["Nashik Food Processing Unit"], days_ago=2)
        _pay(db, payment15, buyer_users["Nashik Food Processing Unit"], payment15.amount_due)
        _settle(db, lot15, payment15, [(f1["Lata Wagh"], 340.0), (f1["Dilip Chavan"], 610.0)], fpo_user)
        dispute15 = _raise_dispute(db, lot15, po15, buyer_users["Nashik Food Processing Unit"], "Roughly one-fifth of the delivered bags were under-weight compared to the manifest; requesting re-weighment and a price adjustment.", status=DisputeStatus.UNDER_REVIEW)
        db.add(DisputeEvidence(dispute_id=dispute15.id, evidence_type="NOTE", description="Weighbridge slip at buyer warehouse shows 6% shortfall versus the purchase order quantity.", uploaded_by_user_id=buyer_users["Nashik Food Processing Unit"].id))
        dispute15.proposed_resolution = "Requesting a price adjustment proportional to the measured shortfall, pending FPO review of the weighbridge evidence against the original assayer record."

        # --- LOT-0016: CLOSED — lower grade via step-down tolerance pricing ------
        lot16 = _new_lot(db, fpo=fpo2, commodity=onion, contributors=[(f2["Pushpa Bhagat"], 360.0), (f2["Nivrutti Shelke"], 400.0), (f2["Yamuna Kolhe"], 200.0)], village="Yeola", collection_point="Yeola Collection Centre", variety="Agrifound Dark Red", created_by=fpo2_user, days_ago=30)
        _collect(db, lot16, fpo2_user)
        _screen(db, lot16, fpo2_user, grade="C", confidence=68.0, flags=["surface damage", "moisture spotting"])
        _assess(db, lot16, assayer2, assayer2_user, Grade.C, 940.0, sample_kg=12.0, defects=["visible sprouting on ~15% of sample", "surface moisture spotting"], notes="Below-target grade due to early sprouting; still usable for wholesale at a step-down price.")
        _open_for_offers(db, lot16, fpo2_user)
        o16 = _make_offer(db, lot16, buyers["Regional Onion Wholesaler"], buyer_users["Regional Onion Wholesaler"], gross=20.0, transport=1.0, loading=0.3, qty=940.0, grade="C")
        _accept_offer(db, lot16, o16, [], fpo2_user)
        po16, payment16 = _create_po(db, lot16, o16, fpo2, fpo2_user, delivery_location="Regional Onion Wholesaler Yard, Panchavati, Nashik", quantity_kg=940.0, po_status=POStatus.FULFILLED)
        _assign_shipment(db, lot16, po16, transporter2, transporter2_user, vehicle_number="MH-15-CT-4477", vehicle_type="Open tempo, 3 tonne", capacity_kg=3000, driver_contact="9990000498", pickup_point="Yeola Collection Centre", status=ShipmentStatus.DELIVERED, hours_ago=200)
        _confirm_delivery(db, lot16, po16, payment16, admin_user, delivered_grade="C")
        _initiate_payment(db, payment16, buyer_users["Regional Onion Wholesaler"], days_ago=9)
        _pay(db, payment16, buyer_users["Regional Onion Wholesaler"], payment16.amount_due)
        _settle(db, lot16, payment16, [(f2["Pushpa Bhagat"], 360.0), (f2["Nivrutti Shelke"], 400.0), (f2["Yamuna Kolhe"], 200.0)], fpo2_user)
        lot16.status = LotStatus.CLOSED
        _audit(db, fpo2_user, "LOT_CLOSED", "Lot", lot16.id, new_value={"status": "CLOSED"})

        db.commit()
        print("  15 additional lots seeded across every workflow status (DRAFT through CLOSED).")

        print(f"\nAll demo accounts use the password: {DEMO_PASSWORD}\n")
        print("Primary demo accounts:")
        print("  farmer       farmer@annadata.demo (Kavita Shinde)")
        print("  farmer       ganesh.patil@annadata.demo")
        print("  farmer       rajendra.jadhav@annadata.demo")
        print("  fpo_agent    fpo@annadata.demo (Niphad FPO)")
        print("  buyer        buyer@annadata.demo")
        print("  buyer        buyer2@annadata.demo")
        print("  buyer        buyer3@annadata.demo")
        print("  assayer      assayer@annadata.demo")
        print("  transporter  transporter@annadata.demo")
        print("  admin        admin@annadata.demo")
        print("\nAdditional accounts (same password) for the extended dataset:")
        print("  fpo_agent    fpo2@annadata.demo (Yeola FPO)")
        print("  buyer        buyer4@annadata.demo (exporter, verified)")
        print("  buyer        buyer5@annadata.demo (wholesaler, verification PENDING)")
        print("  buyer        buyer6@annadata.demo (retailer, UNVERIFIED — cannot submit offers)")
        print("  assayer      assayer2@annadata.demo")
        print("  transporter  transporter2@annadata.demo")
        print("  + 15 more farmer accounts (<firstname>.<lastname>@annadata.demo)")
        print("\nTotal: 2 FPOs · 18 farmers · 6 buyers · 2 assayers · 2 transporters · 3 storage facilities · 16 lots")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
