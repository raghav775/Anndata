from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.deps import require_roles
from app.models.enums import DisputeStatus, SettlementStatus, ShipmentStatus, UserRole
from app.models.dispute import Dispute
from app.models.finance import Payment, Settlement
from app.models.lot import Lot
from app.models.logistics import Shipment
from app.models.marketplace import PurchaseOrder
from app.models.user import FarmerProfile, User
from app.schemas.system import AnalyticsOut

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsOut)
def get_analytics(
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles(UserRole.ADMIN, UserRole.FPO_AGENT)),
) -> AnalyticsOut:
    total_farmers = db.query(FarmerProfile).count()
    lots = db.query(Lot).all()
    total_lots = len(lots)
    total_quantity = sum(lot.total_quantity_kg for lot in lots)

    pos = db.query(PurchaseOrder).all()
    if pos:
        avg_realization = sum(po.net_price_per_kg for po in pos) / len(pos)
    else:
        avg_realization = 0.0

    payments = db.query(Payment).all()
    total_transaction_value = sum(p.amount_received for p in payments)

    settlements = db.query(Settlement).all()
    pending_settlements = len(
        [s for s in settlements if s.status == SettlementStatus.PENDING]
    )
    completed_settlements = len(
        [s for s in settlements if s.status == SettlementStatus.COMPLETED]
    )

    disputes = db.query(Dispute).all()
    total_disputes = len(disputes)
    open_disputes = len(
        [
            d
            for d in disputes
            if d.status not in (DisputeStatus.RESOLVED, DisputeStatus.REJECTED)
        ]
    )
    resolved = [d for d in disputes if d.resolved_at is not None]
    if resolved:
        avg_hours = sum(
            (d.resolved_at - d.created_at).total_seconds() / 3600 for d in resolved
        ) / len(resolved)
    else:
        avg_hours = None

    fulfilled_pos = len([po for po in pos if po.status.value == "FULFILLED"])
    fulfillment_rate = (fulfilled_pos / len(pos) * 100) if pos else 0.0

    active_shipments = (
        db.query(Shipment).filter(Shipment.status != ShipmentStatus.DELIVERED).count()
    )

    return AnalyticsOut(
        total_farmers=total_farmers,
        total_lots=total_lots,
        total_quantity_kg=total_quantity,
        average_net_realization_per_kg=round(avg_realization, 2),
        total_transaction_value=round(total_transaction_value, 2),
        pending_settlements=pending_settlements,
        completed_settlements=completed_settlements,
        total_disputes=total_disputes,
        open_disputes=open_disputes,
        average_dispute_resolution_hours=round(avg_hours, 2)
        if avg_hours is not None
        else None,
        buyer_fulfillment_rate=round(fulfillment_rate, 2),
        active_shipments=active_shipments,
    )
