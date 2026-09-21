from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ForbiddenError, NotFoundError, ValidationAppError
from app.middleware.deps import get_client_ip, get_current_user, require_roles
from app.models.enums import (
    Grade,
    LotStatus,
    OfferStatus,
    PaymentStatus,
    POStatus,
    UserRole,
)
from app.models.finance import Payment
from app.models.lot import Lot
from app.models.marketplace import Offer, PurchaseOrder
from app.models.user import User
from app.schemas.marketplace import PurchaseOrderCreate, PurchaseOrderOut
from app.services.audit import record_audit
from app.services.codes import generate_po_number
from app.services.net_price import DeductionBreakdown, compute_net_price_per_kg
from app.services.notifications import create_notification
from app.services.tolerance import resolve_tolerance_pricing

router = APIRouter(prefix="/api/purchase-orders", tags=["purchase-orders"])


def _assert_po_access(user: User, po: PurchaseOrder) -> None:
    if user.role == UserRole.ADMIN:
        return
    if user.role == UserRole.FPO_AGENT and user.fpo_agent_profile.fpo_id == po.fpo_id:
        return
    if user.role == UserRole.BUYER and po.buyer.user_id == user.id:
        return
    raise ForbiddenError("You do not have permission to view this purchase order")


@router.post("", response_model=PurchaseOrderOut)
def create_purchase_order(
    payload: PurchaseOrderCreate,
    request: Request,
    db: Session = Depends(get_db),
    agent: User = Depends(require_roles(UserRole.FPO_AGENT, UserRole.ADMIN)),
) -> PurchaseOrder:
    offer = db.get(Offer, payload.offer_id)
    if offer is None:
        raise NotFoundError("Offer not found")
    if offer.status != OfferStatus.ACCEPTED:
        raise ValidationAppError("Only an accepted offer can become a purchase order")

    lot = db.get(Lot, offer.lot_id)
    if lot.status != LotStatus.OFFER_ACCEPTED:
        raise ValidationAppError("Lot must be in OFFER_ACCEPTED status")
    existing = (
        db.query(PurchaseOrder).filter(PurchaseOrder.offer_id == offer.id).first()
    )
    if existing:
        raise ValidationAppError("A purchase order already exists for this offer")

    quantity_kg = (
        lot.quality_assessment.final_weight_kg
        if lot.quality_assessment
        else lot.total_quantity_kg
    )
    deductions = DeductionBreakdown(
        transport_cost_per_kg=offer.transport_cost_per_kg,
        loading_unloading_per_kg=offer.loading_unloading_per_kg,
        grading_fee_per_kg=offer.grading_fee_per_kg,
        storage_cost_per_kg=offer.storage_cost_per_kg,
        platform_fee_per_kg=offer.platform_fee_per_kg,
        other_deductions=offer.other_deductions,
    )
    net_price = compute_net_price_per_kg(offer.gross_price_per_kg, deductions)

    po = PurchaseOrder(
        po_number=generate_po_number(db),
        lot_id=lot.id,
        offer_id=offer.id,
        buyer_id=offer.buyer_id,
        fpo_id=lot.fpo_id,
        quantity_kg=quantity_kg,
        contracted_grade=lot.final_grade.value
        if lot.final_grade
        else offer.required_grade,
        gross_price_per_kg=offer.gross_price_per_kg,
        deductions=deductions.as_dict(),
        net_price_per_kg=net_price,
        tolerance_rules=[r.model_dump() for r in payload.tolerance_rules],
        reject_below_grade=payload.reject_below_grade,
        contamination_auto_reject=payload.contamination_auto_reject,
        delivery_location=payload.delivery_location,
        payment_deadline_days=payload.payment_deadline_days,
        inspection_deadline_days=payload.inspection_deadline_days,
        transport_responsibility=payload.transport_responsibility,
        storage_responsibility=payload.storage_responsibility,
    )
    db.add(po)
    db.flush()

    payment = Payment(
        purchase_order_id=po.id,
        lot_id=lot.id,
        buyer_id=po.buyer_id,
        amount_due=round(net_price * quantity_kg, 2),
        status=PaymentStatus.PAYMENT_PENDING,
    )
    db.add(payment)

    lot.status = LotStatus.PURCHASE_ORDER_CREATED

    record_audit(
        db,
        actor=agent,
        action="PURCHASE_ORDER_CREATED",
        entity_type="PurchaseOrder",
        entity_id=po.id,
        new_value={"po_number": po.po_number, "net_price_per_kg": net_price},
        ip_address=get_client_ip(request),
    )
    create_notification(
        db,
        user_id=offer.buyer.user_id,
        type="PURCHASE_ORDER_CREATED",
        title="Purchase order issued",
        message=f"Purchase order {po.po_number} has been issued for lot {lot.lot_code}.",
        entity_type="PurchaseOrder",
        entity_id=po.id,
    )
    db.commit()
    db.refresh(po)
    return po


@router.get("", response_model=list[PurchaseOrderOut])
def list_purchase_orders(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[PurchaseOrder]:
    query = db.query(PurchaseOrder)
    if user.role == UserRole.FPO_AGENT:
        query = query.filter(PurchaseOrder.fpo_id == user.fpo_agent_profile.fpo_id)
    elif user.role == UserRole.BUYER:
        from app.models.user import BuyerProfile

        query = query.join(PurchaseOrder.buyer).filter(BuyerProfile.user_id == user.id)
    elif user.role != UserRole.ADMIN:
        return []
    return query.order_by(PurchaseOrder.id.desc()).all()


@router.get("/{po_id}", response_model=PurchaseOrderOut)
def get_purchase_order(
    po_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> PurchaseOrder:
    po = db.get(PurchaseOrder, po_id)
    if po is None:
        raise NotFoundError("Purchase order not found")
    _assert_po_access(user, po)
    return po


class DeliveryConfirmation(BaseModel):
    delivered_grade: Grade | None = None
    contamination_flagged: bool = False


class DeliveryConfirmationResult(BaseModel):
    outcome: str
    applicable_price_per_kg: float
    note: str
    purchase_order: PurchaseOrderOut


@router.post("/{po_id}/confirm-delivery", response_model=DeliveryConfirmationResult)
def confirm_delivery(
    po_id: int,
    payload: DeliveryConfirmation,
    request: Request,
    db: Session = Depends(get_db),
    buyer_user: User = Depends(require_roles(UserRole.BUYER, UserRole.ADMIN)),
) -> DeliveryConfirmationResult:
    po = db.get(PurchaseOrder, po_id)
    if po is None:
        raise NotFoundError("Purchase order not found")
    if buyer_user.role == UserRole.BUYER and po.buyer.user_id != buyer_user.id:
        raise ForbiddenError("This purchase order does not belong to you")

    lot = db.get(Lot, po.lot_id)
    delivered_grade = (payload.delivered_grade or Grade(po.contracted_grade)).value

    outcome = resolve_tolerance_pricing(
        contracted_grade=po.contracted_grade,
        delivered_grade=delivered_grade,
        contracted_net_price_per_kg=po.net_price_per_kg,
        tolerance_rules=po.tolerance_rules,
        reject_below_grade=po.reject_below_grade,
        contamination_flagged=payload.contamination_flagged,
        contamination_auto_reject=po.contamination_auto_reject,
    )

    if lot.status in (LotStatus.DISPATCHED, LotStatus.PURCHASE_ORDER_CREATED):
        lot.status = LotStatus.DELIVERED

    po.status = POStatus.FULFILLED

    payment = db.query(Payment).filter(Payment.purchase_order_id == po.id).first()
    if payment and outcome.outcome in ("ACCEPTED_FULL", "ACCEPTED_STEP_DOWN"):
        payment.amount_due = round(outcome.applicable_price_per_kg * po.quantity_kg, 2)
        if payment.status == PaymentStatus.PAYMENT_PENDING:
            payment.status = PaymentStatus.DELIVERED

    record_audit(
        db,
        actor=buyer_user,
        action="DELIVERY_CONFIRMED",
        entity_type="PurchaseOrder",
        entity_id=po.id,
        new_value={
            "delivered_grade": delivered_grade,
            "outcome": outcome.outcome,
            "applicable_price_per_kg": outcome.applicable_price_per_kg,
        },
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(po)
    return DeliveryConfirmationResult(
        outcome=outcome.outcome,
        applicable_price_per_kg=outcome.applicable_price_per_kg,
        note=outcome.note,
        purchase_order=po,
    )
