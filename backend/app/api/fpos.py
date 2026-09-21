from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ForbiddenError, NotFoundError
from app.middleware.deps import get_current_user, require_roles
from app.models.enums import (
    DisputeStatus,
    LotStatus,
    OfferStatus,
    PaymentStatus,
    ShipmentStatus,
    UserRole,
)
from app.models.dispute import Dispute
from app.models.finance import Payment
from app.models.lot import Lot
from app.models.marketplace import Offer, PurchaseOrder
from app.models.logistics import Shipment
from app.models.user import FarmerProfile, FPOOrganization, User
from app.schemas.user import FPOOrganizationOut

router = APIRouter(prefix="/api/fpos", tags=["fpos"])


class FPODashboardOut(BaseModel):
    total_farmers: int
    total_produce_kg: float
    active_lots: int
    pending_assessment: int
    active_offers: int
    accepted_orders: int
    active_shipments: int
    pending_payments: int
    open_disputes: int


@router.get("", response_model=list[FPOOrganizationOut])
def list_fpos(
    db: Session = Depends(get_db), _user: User = Depends(get_current_user)
) -> list[FPOOrganization]:
    return db.query(FPOOrganization).order_by(FPOOrganization.id).all()


@router.get("/{fpo_id}", response_model=FPOOrganizationOut)
def get_fpo(
    fpo_id: int, db: Session = Depends(get_db), _user: User = Depends(get_current_user)
) -> FPOOrganization:
    fpo = db.get(FPOOrganization, fpo_id)
    if fpo is None:
        raise NotFoundError("FPO not found")
    return fpo


def _assert_fpo_access(user: User, fpo_id: int) -> None:
    if user.role == UserRole.ADMIN:
        return
    if user.role == UserRole.FPO_AGENT and user.fpo_agent_profile.fpo_id == fpo_id:
        return
    raise ForbiddenError("You do not have permission to view this FPO's dashboard")


@router.get("/{fpo_id}/dashboard", response_model=FPODashboardOut)
def fpo_dashboard(
    fpo_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.FPO_AGENT, UserRole.ADMIN)),
) -> FPODashboardOut:
    if db.get(FPOOrganization, fpo_id) is None:
        raise NotFoundError("FPO not found")
    _assert_fpo_access(user, fpo_id)

    total_farmers = (
        db.query(FarmerProfile).filter(FarmerProfile.fpo_id == fpo_id).count()
    )
    lots = db.query(Lot).filter(Lot.fpo_id == fpo_id).all()
    lot_ids = [lot.id for lot in lots]
    total_produce = sum(lot.total_quantity_kg for lot in lots)
    active_lots = len(
        [lot for lot in lots if lot.status not in (LotStatus.SETTLED, LotStatus.CLOSED)]
    )
    pending_assessment = len(
        [lot for lot in lots if lot.status == LotStatus.UNDER_ASSESSMENT]
    )
    active_offers = (
        db.query(Offer)
        .filter(Offer.lot_id.in_(lot_ids), Offer.status == OfferStatus.ACTIVE)
        .count()
        if lot_ids
        else 0
    )
    accepted_orders = (
        db.query(PurchaseOrder).filter(PurchaseOrder.fpo_id == fpo_id).count()
    )
    active_shipments = (
        db.query(Shipment)
        .filter(
            Shipment.lot_id.in_(lot_ids), Shipment.status != ShipmentStatus.DELIVERED
        )
        .count()
        if lot_ids
        else 0
    )
    pending_payments = (
        db.query(Payment)
        .filter(
            Payment.lot_id.in_(lot_ids),
            Payment.status.notin_([PaymentStatus.PAYMENT_COMPLETED]),
        )
        .count()
        if lot_ids
        else 0
    )
    open_disputes = (
        db.query(Dispute)
        .filter(
            Dispute.lot_id.in_(lot_ids),
            Dispute.status.notin_([DisputeStatus.RESOLVED, DisputeStatus.REJECTED]),
        )
        .count()
        if lot_ids
        else 0
    )

    return FPODashboardOut(
        total_farmers=total_farmers,
        total_produce_kg=total_produce,
        active_lots=active_lots,
        pending_assessment=pending_assessment,
        active_offers=active_offers,
        accepted_orders=accepted_orders,
        active_shipments=active_shipments,
        pending_payments=pending_payments,
        open_disputes=open_disputes,
    )
