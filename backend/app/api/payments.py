from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ForbiddenError, NotFoundError, ValidationAppError
from app.middleware.deps import get_client_ip, get_current_user, require_roles
from app.models.enums import PaymentStatus, UserRole
from app.models.finance import Payment
from app.models.lot import Lot
from app.models.user import User
from app.schemas.finance import PaymentActionRequest, PaymentOut
from app.services.audit import record_audit
from app.services.codes import generate_transaction_reference
from app.services.notifications import create_notification

router = APIRouter(prefix="/api/payments", tags=["payments"])


def _assert_payment_access(user: User, payment: Payment) -> None:
    if user.role == UserRole.ADMIN:
        return
    if user.role == UserRole.BUYER and payment.buyer.user_id == user.id:
        return
    if (
        user.role == UserRole.FPO_AGENT
        and payment.lot.fpo_id == user.fpo_agent_profile.fpo_id
    ):
        return
    raise ForbiddenError("You do not have permission to view this payment")


@router.get("", response_model=list[PaymentOut])
def list_payments(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[Payment]:
    query = db.query(Payment)
    if user.role == UserRole.BUYER:
        from app.models.user import BuyerProfile

        query = query.join(Payment.buyer).filter(BuyerProfile.user_id == user.id)
    elif user.role == UserRole.FPO_AGENT:
        query = query.join(Payment.lot).filter(
            Lot.fpo_id == user.fpo_agent_profile.fpo_id
        )
    elif user.role != UserRole.ADMIN:
        return []
    return query.order_by(Payment.id.desc()).all()


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Payment:
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise NotFoundError("Payment not found")
    _assert_payment_access(user, payment)
    return payment


@router.post("/{payment_id}/initiate", response_model=PaymentOut)
def initiate_payment(
    payment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    buyer_user: User = Depends(require_roles(UserRole.BUYER, UserRole.ADMIN)),
) -> Payment:
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise NotFoundError("Payment not found")
    if buyer_user.role == UserRole.BUYER and payment.buyer.user_id != buyer_user.id:
        raise ForbiddenError("This payment does not belong to you")
    if payment.status not in (
        PaymentStatus.PAYMENT_PENDING,
        PaymentStatus.DISPATCHED,
        PaymentStatus.DELIVERED,
    ):
        raise ValidationAppError(
            f"Cannot initiate payment from status {payment.status.value}"
        )

    payment.status = PaymentStatus.PAYMENT_INITIATED
    payment.transaction_reference = generate_transaction_reference()
    payment.initiated_at = datetime.now(timezone.utc)

    record_audit(
        db,
        actor=buyer_user,
        action="PAYMENT_INITIATED",
        entity_type="Payment",
        entity_id=payment.id,
        new_value={"transaction_reference": payment.transaction_reference},
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(payment)
    return payment


@router.post("/{payment_id}/pay", response_model=PaymentOut)
def make_payment(
    payment_id: int,
    payload: PaymentActionRequest,
    request: Request,
    db: Session = Depends(get_db),
    buyer_user: User = Depends(require_roles(UserRole.BUYER, UserRole.ADMIN)),
) -> Payment:
    """Mock payment action — no real money moves. Guards against duplicate/
    over-payment so the demo fails safely on bad input."""
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise NotFoundError("Payment not found")
    if buyer_user.role == UserRole.BUYER and payment.buyer.user_id != buyer_user.id:
        raise ForbiddenError("This payment does not belong to you")
    if payment.status == PaymentStatus.PAYMENT_COMPLETED:
        raise ValidationAppError("This payment has already been completed")
    if payment.status not in (
        PaymentStatus.PAYMENT_INITIATED,
        PaymentStatus.PARTIALLY_PAID,
        PaymentStatus.OVERDUE,
    ):
        raise ValidationAppError("Payment must be initiated before it can be paid")

    remaining = round(payment.amount_due - payment.amount_received, 2)
    if payload.amount > remaining + 0.01:
        raise ValidationAppError(
            f"Payment amount ₹{payload.amount} exceeds the remaining due amount ₹{remaining}"
        )

    payment.amount_received = round(payment.amount_received + payload.amount, 2)
    if payment.amount_received >= payment.amount_due - 0.01:
        payment.status = PaymentStatus.PAYMENT_COMPLETED
        payment.completed_at = datetime.now(timezone.utc)
    else:
        payment.status = PaymentStatus.PARTIALLY_PAID

    record_audit(
        db,
        actor=buyer_user,
        action="PAYMENT_RECEIVED",
        entity_type="Payment",
        entity_id=payment.id,
        new_value={"amount": payload.amount, "status": payment.status.value},
        ip_address=get_client_ip(request),
    )

    if payment.status == PaymentStatus.PAYMENT_COMPLETED:
        for agent_user_id in _fpo_agent_user_ids(db, payment.lot.fpo_id):
            create_notification(
                db,
                user_id=agent_user_id,
                type="PAYMENT_COMPLETED",
                title="Payment received",
                message=f"Payment for lot {payment.lot.lot_code} has been completed by the buyer.",
                entity_type="Payment",
                entity_id=payment.id,
            )

    db.commit()
    db.refresh(payment)
    return payment


def _fpo_agent_user_ids(db: Session, fpo_id: int) -> list[int]:
    from app.models.user import FPOAgentProfile

    return [
        row.user_id
        for row in db.query(FPOAgentProfile)
        .filter(FPOAgentProfile.fpo_id == fpo_id)
        .all()
    ]
