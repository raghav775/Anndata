from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ForbiddenError, NotFoundError, ValidationAppError
from app.middleware.deps import get_client_ip, get_current_user, require_roles
from app.models.enums import LotStatus, PaymentStatus, SettlementStatus, UserRole
from app.models.finance import Payment, Settlement, SettlementItem
from app.models.lot import Lot, LotContributor
from app.models.user import FarmerProfile, User
from app.schemas.finance import SettlementOut
from app.services.audit import record_audit
from app.services.notifications import create_notification
from app.services.settlement import ContributorShare, compute_settlement_items

router = APIRouter(prefix="/api/settlements", tags=["settlements"])


def _settlement_out(settlement: Settlement) -> SettlementOut:
    out = SettlementOut.model_validate(settlement)
    for i, item in enumerate(settlement.items):
        out.items[i].farmer_name = item.farmer.user.full_name
    return out


@router.get("", response_model=list[SettlementOut])
def list_settlements(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.FPO_AGENT, UserRole.ADMIN)),
) -> list[SettlementOut]:
    query = db.query(Settlement)
    if user.role == UserRole.FPO_AGENT:
        query = query.join(Settlement.lot).filter(
            Lot.fpo_id == user.fpo_agent_profile.fpo_id
        )
    return [_settlement_out(s) for s in query.order_by(Settlement.id.desc()).all()]


@router.post("/{lot_id}/initiate", response_model=SettlementOut)
def initiate_settlement(
    lot_id: int,
    request: Request,
    db: Session = Depends(get_db),
    agent: User = Depends(require_roles(UserRole.FPO_AGENT, UserRole.ADMIN)),
) -> SettlementOut:
    lot = db.get(Lot, lot_id)
    if lot is None:
        raise NotFoundError("Lot not found")
    if db.query(Settlement).filter(Settlement.lot_id == lot_id).first():
        raise ValidationAppError("A settlement already exists for this lot")

    payment = db.query(Payment).filter(Payment.lot_id == lot_id).first()
    if payment is None or payment.status not in (
        PaymentStatus.PAYMENT_COMPLETED,
        PaymentStatus.PARTIALLY_PAID,
    ):
        raise ValidationAppError(
            "Settlement can only be initiated once payment has been received"
        )

    contributors = (
        db.query(LotContributor).filter(LotContributor.lot_id == lot_id).all()
    )
    if not contributors:
        raise ValidationAppError("This lot has no farmer contributors to settle")

    lines = compute_settlement_items(
        contributors=[
            ContributorShare(farmer_id=c.farmer_id, quantity_kg=c.quantity_kg)
            for c in contributors
        ],
        total_amount=payment.amount_received,
    )

    settlement = Settlement(
        lot_id=lot.id,
        payment_id=payment.id,
        total_amount=payment.amount_received,
        status=(
            SettlementStatus.COMPLETED
            if payment.status == PaymentStatus.PAYMENT_COMPLETED
            else SettlementStatus.PARTIAL
        ),
    )
    db.add(settlement)
    db.flush()

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
            )
        )

    if lot.status in (LotStatus.DELIVERED,):
        lot.status = LotStatus.SETTLED

    record_audit(
        db,
        actor=agent,
        action="SETTLEMENT_INITIATED",
        entity_type="Settlement",
        entity_id=settlement.id,
        new_value={"lot_id": lot.id, "total_amount": payment.amount_received},
        ip_address=get_client_ip(request),
    )

    for line in lines:
        farmer = db.get(FarmerProfile, line.farmer_id)
        create_notification(
            db,
            user_id=farmer.user_id,
            type="SETTLEMENT_AVAILABLE",
            title="Settlement ready",
            message=f"Your settlement for lot {lot.lot_code} is ready: ₹{line.net_amount}.",
            entity_type="Settlement",
            entity_id=settlement.id,
        )

    db.commit()
    db.refresh(settlement)
    return _settlement_out(settlement)


def _assert_settlement_access(user: User, settlement: Settlement) -> None:
    if user.role == UserRole.ADMIN:
        return
    if (
        user.role == UserRole.FPO_AGENT
        and settlement.lot.fpo_id == user.fpo_agent_profile.fpo_id
    ):
        return
    if user.role == UserRole.FARMER:
        farmer_ids = {item.farmer_id for item in settlement.items}
        if user.farmer_profile.id in farmer_ids:
            return
    raise ForbiddenError("You do not have permission to view this settlement")


@router.get("/lot/{lot_id}", response_model=SettlementOut)
def get_settlement_for_lot(
    lot_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> SettlementOut:
    settlement = db.query(Settlement).filter(Settlement.lot_id == lot_id).first()
    if settlement is None:
        raise NotFoundError("No settlement exists yet for this lot")
    _assert_settlement_access(user, settlement)
    out = _settlement_out(settlement)
    if user.role == UserRole.FARMER:
        out.items = [i for i in out.items if i.farmer_id == user.farmer_profile.id]
    return out


@router.get("/farmer/{farmer_id}", response_model=list[SettlementOut])
def get_settlements_for_farmer(
    farmer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[SettlementOut]:
    farmer = db.get(FarmerProfile, farmer_id)
    if farmer is None:
        raise NotFoundError("Farmer not found")
    if user.role == UserRole.ADMIN:
        pass
    elif user.role == UserRole.FARMER and farmer.user_id == user.id:
        pass
    elif (
        user.role == UserRole.FPO_AGENT
        and farmer.fpo_id == user.fpo_agent_profile.fpo_id
    ):
        pass
    else:
        raise ForbiddenError(
            "You do not have permission to view this farmer's settlements"
        )

    settlement_ids = {
        item.settlement_id
        for item in db.query(SettlementItem)
        .filter(SettlementItem.farmer_id == farmer_id)
        .all()
    }
    settlements = (
        db.query(Settlement).filter(Settlement.id.in_(settlement_ids or [-1])).all()
    )
    results = []
    for settlement in settlements:
        out = _settlement_out(settlement)
        out.items = [i for i in out.items if i.farmer_id == farmer_id]
        results.append(out)
    return results
