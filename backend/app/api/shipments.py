from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ForbiddenError, NotFoundError, ValidationAppError
from app.middleware.deps import get_client_ip, get_current_user, require_roles
from app.models.enums import LotStatus, PaymentStatus, ShipmentStatus, UserRole
from app.models.finance import Payment
from app.models.lot import Lot
from app.models.logistics import Shipment
from app.models.marketplace import PurchaseOrder
from app.models.user import TransporterProfile, User
from app.schemas.logistics import ShipmentCreate, ShipmentOut, ShipmentStatusUpdate
from app.services.audit import record_audit
from app.services.notifications import create_notification

router = APIRouter(prefix="/api/shipments", tags=["shipments"])

_DISPATCH_STATES = {ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT}


@router.post("", response_model=ShipmentOut)
def assign_shipment(
    payload: ShipmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    agent: User = Depends(require_roles(UserRole.FPO_AGENT, UserRole.ADMIN)),
) -> Shipment:
    lot = db.get(Lot, payload.lot_id)
    if lot is None:
        raise NotFoundError("Lot not found")
    po = db.get(PurchaseOrder, payload.purchase_order_id)
    if po is None or po.lot_id != lot.id:
        raise ValidationAppError("Purchase order does not match this lot")
    if db.get(TransporterProfile, payload.transporter_id) is None:
        raise NotFoundError("Transporter not found")
    if lot.status != LotStatus.PURCHASE_ORDER_CREATED:
        raise ValidationAppError(
            "A transporter can only be assigned after a purchase order exists"
        )

    shipment = Shipment(
        lot_id=payload.lot_id,
        purchase_order_id=payload.purchase_order_id,
        transporter_id=payload.transporter_id,
        vehicle_number=payload.vehicle_number,
        vehicle_type=payload.vehicle_type,
        capacity_kg=payload.capacity_kg,
        driver_contact=payload.driver_contact,
        pickup_point=payload.pickup_point,
        delivery_point=payload.delivery_point,
        estimated_cost=payload.estimated_cost,
        status=ShipmentStatus.ASSIGNED,
    )
    db.add(shipment)
    db.flush()

    record_audit(
        db,
        actor=agent,
        action="TRANSPORT_ASSIGNED",
        entity_type="Shipment",
        entity_id=shipment.id,
        new_value={"lot_id": lot.id, "vehicle_number": payload.vehicle_number},
        ip_address=get_client_ip(request),
    )
    create_notification(
        db,
        user_id=shipment.transporter.user_id,
        type="SHIPMENT_ASSIGNED",
        title="New shipment assigned",
        message=f"You have been assigned to transport lot {lot.lot_code}.",
        entity_type="Shipment",
        entity_id=shipment.id,
    )
    db.commit()
    db.refresh(shipment)
    return shipment


def _assert_shipment_access(user: User, shipment: Shipment) -> None:
    if user.role == UserRole.ADMIN:
        return
    if user.role == UserRole.TRANSPORTER and shipment.transporter.user_id == user.id:
        return
    if (
        user.role == UserRole.FPO_AGENT
        and shipment.lot.fpo_id == user.fpo_agent_profile.fpo_id
    ):
        return
    if user.role == UserRole.BUYER and shipment.purchase_order.buyer.user_id == user.id:
        return
    raise ForbiddenError("You do not have permission to view this shipment")


@router.get("", response_model=list[ShipmentOut])
def list_shipments(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[Shipment]:
    query = db.query(Shipment)
    if user.role == UserRole.TRANSPORTER:
        query = query.filter(Shipment.transporter_id == user.transporter_profile.id)
    elif user.role == UserRole.FPO_AGENT:
        query = query.join(Shipment.lot).filter(
            Lot.fpo_id == user.fpo_agent_profile.fpo_id
        )
    elif user.role != UserRole.ADMIN:
        return []
    return query.order_by(Shipment.id.desc()).all()


@router.get("/{shipment_id}", response_model=ShipmentOut)
def get_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Shipment:
    shipment = db.get(Shipment, shipment_id)
    if shipment is None:
        raise NotFoundError("Shipment not found")
    _assert_shipment_access(user, shipment)
    return shipment


@router.patch("/{shipment_id}/status", response_model=ShipmentOut)
def update_shipment_status(
    shipment_id: int,
    payload: ShipmentStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    transporter_user: User = Depends(
        require_roles(UserRole.TRANSPORTER, UserRole.ADMIN)
    ),
) -> Shipment:
    shipment = db.get(Shipment, shipment_id)
    if shipment is None:
        raise NotFoundError("Shipment not found")
    if (
        transporter_user.role == UserRole.TRANSPORTER
        and shipment.transporter.user_id != transporter_user.id
    ):
        raise ForbiddenError("This shipment is not assigned to you")

    old_status = shipment.status
    shipment.status = payload.status
    now = datetime.now(timezone.utc)

    if payload.status == ShipmentStatus.PICKED_UP:
        shipment.picked_up_at = now
    if payload.status == ShipmentStatus.DELIVERED:
        shipment.delivered_at = now

    lot = db.get(Lot, shipment.lot_id)
    if (
        payload.status in _DISPATCH_STATES
        and lot.status == LotStatus.PURCHASE_ORDER_CREATED
    ):
        lot.status = LotStatus.DISPATCHED

    payment = (
        db.query(Payment)
        .filter(Payment.purchase_order_id == shipment.purchase_order_id)
        .first()
    )
    if (
        payload.status in _DISPATCH_STATES
        and payment
        and payment.status == PaymentStatus.PAYMENT_PENDING
    ):
        payment.status = PaymentStatus.DISPATCHED

    record_audit(
        db,
        actor=transporter_user,
        action="SHIPMENT_STATUS_UPDATED",
        entity_type="Shipment",
        entity_id=shipment.id,
        old_value={"status": old_status.value},
        new_value={"status": payload.status.value},
        ip_address=get_client_ip(request),
    )

    if payload.status == ShipmentStatus.DELIVERED:
        create_notification(
            db,
            user_id=shipment.purchase_order.buyer.user_id,
            type="DELIVERY_COMPLETED",
            title="Shipment delivered",
            message=f"Lot {lot.lot_code} has been delivered to {shipment.delivery_point}.",
            entity_type="Shipment",
            entity_id=shipment.id,
        )

    db.commit()
    db.refresh(shipment)
    return shipment
