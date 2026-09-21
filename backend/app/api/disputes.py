from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import (
    ForbiddenError,
    InvalidStateTransitionError,
    NotFoundError,
    ValidationAppError,
)
from app.middleware.deps import get_client_ip, get_current_user, require_roles
from app.models.enums import DisputeStatus, LotStatus, SettlementStatus, UserRole
from app.models.dispute import Dispute, DisputeEvidence
from app.models.finance import Settlement
from app.models.lot import Lot
from app.models.user import User
from app.schemas.dispute import (
    DisputeCreate,
    DisputeOut,
    DisputeResolution,
    DisputeStatusUpdate,
)
from app.services.audit import record_audit
from app.services.codes import generate_dispute_code
from app.services.file_storage import get_storage, validate_and_read_upload
from app.services.lot_state import assert_transition_allowed
from app.services.notifications import create_notification
from app.services.settlement import ContributorShare, compute_settlement_items

router = APIRouter(prefix="/api/disputes", tags=["disputes"])

_DISPUTE_TRANSITIONS: dict[DisputeStatus, set[DisputeStatus]] = {
    DisputeStatus.OPEN: {
        DisputeStatus.UNDER_REVIEW,
        DisputeStatus.EVIDENCE_REQUESTED,
        DisputeStatus.ESCALATED,
        DisputeStatus.REJECTED,
    },
    DisputeStatus.UNDER_REVIEW: {
        DisputeStatus.EVIDENCE_REQUESTED,
        DisputeStatus.RESOLVED,
        DisputeStatus.REJECTED,
        DisputeStatus.ESCALATED,
    },
    DisputeStatus.EVIDENCE_REQUESTED: {DisputeStatus.UNDER_REVIEW},
    DisputeStatus.ESCALATED: {
        DisputeStatus.UNDER_REVIEW,
        DisputeStatus.RESOLVED,
        DisputeStatus.REJECTED,
    },
    DisputeStatus.RESOLVED: set(),
    DisputeStatus.REJECTED: set(),
}

_LOT_DISPUTE_ELIGIBLE = {
    LotStatus.PURCHASE_ORDER_CREATED,
    LotStatus.DISPATCHED,
    LotStatus.DELIVERED,
    LotStatus.SETTLED,
}


def _dispute_out(dispute: Dispute) -> DisputeOut:
    return DisputeOut.model_validate(dispute)


@router.post("", response_model=DisputeOut)
def create_dispute(
    payload: DisputeCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(UserRole.BUYER, UserRole.FPO_AGENT, UserRole.ADMIN)
    ),
) -> DisputeOut:
    lot = db.get(Lot, payload.lot_id)
    if lot is None:
        raise NotFoundError("Lot not found")

    dispute = Dispute(
        dispute_code=generate_dispute_code(db),
        lot_id=lot.id,
        purchase_order_id=payload.purchase_order_id,
        raised_by_user_id=user.id,
        reason=payload.reason,
        status=DisputeStatus.OPEN,
    )
    db.add(dispute)

    if lot.status in _LOT_DISPUTE_ELIGIBLE:
        lot.pre_dispute_status = lot.status
        assert_transition_allowed(lot.status, LotStatus.DISPUTED)
        lot.status = LotStatus.DISPUTED

    db.flush()

    record_audit(
        db,
        actor=user,
        action="DISPUTE_OPENED",
        entity_type="Dispute",
        entity_id=dispute.id,
        new_value={"lot_id": lot.id, "reason": payload.reason},
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(dispute)
    return _dispute_out(dispute)


def _assert_dispute_access(user: User, dispute: Dispute) -> None:
    if user.role == UserRole.ADMIN:
        return
    if (
        user.role == UserRole.FPO_AGENT
        and dispute.lot.fpo_id == user.fpo_agent_profile.fpo_id
    ):
        return
    if dispute.raised_by_user_id == user.id:
        return
    if (
        dispute.purchase_order_id
        and user.role == UserRole.BUYER
        and dispute.purchase_order
        and dispute.purchase_order.buyer.user_id == user.id
    ):
        return
    raise ForbiddenError("You do not have permission to view this dispute")


@router.get("", response_model=list[DisputeOut])
def list_disputes(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[DisputeOut]:
    query = db.query(Dispute)
    if user.role == UserRole.FPO_AGENT:
        query = query.join(Dispute.lot).filter(
            Lot.fpo_id == user.fpo_agent_profile.fpo_id
        )
    elif user.role == UserRole.BUYER:
        query = query.filter(Dispute.raised_by_user_id == user.id)
    elif user.role not in (UserRole.ADMIN,):
        query = query.filter(Dispute.raised_by_user_id == user.id)
    return [_dispute_out(d) for d in query.order_by(Dispute.id.desc()).all()]


@router.get("/{dispute_id}", response_model=DisputeOut)
def get_dispute(
    dispute_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DisputeOut:
    dispute = db.get(Dispute, dispute_id)
    if dispute is None:
        raise NotFoundError("Dispute not found")
    _assert_dispute_access(user, dispute)
    return _dispute_out(dispute)


@router.post("/{dispute_id}/evidence", response_model=DisputeOut)
async def add_evidence(
    dispute_id: int,
    request: Request,
    evidence_type: str = Form(...),
    description: str = Form(...),
    sensor_event_id: int | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DisputeOut:
    dispute = db.get(Dispute, dispute_id)
    if dispute is None:
        raise NotFoundError("Dispute not found")
    _assert_dispute_access(user, dispute)
    if dispute.status in (DisputeStatus.RESOLVED, DisputeStatus.REJECTED):
        raise ValidationAppError(
            "This dispute is already closed; evidence can no longer be added"
        )

    file_path = None
    if file is not None:
        content = await validate_and_read_upload(file)
        file_path = get_storage().save(file, f"disputes/{dispute.id}", content)

    evidence = DisputeEvidence(
        dispute_id=dispute.id,
        evidence_type=evidence_type,
        file_path=file_path,
        sensor_event_id=sensor_event_id,
        description=description,
        uploaded_by_user_id=user.id,
    )
    db.add(evidence)

    record_audit(
        db,
        actor=user,
        action="DISPUTE_EVIDENCE_ADDED",
        entity_type="Dispute",
        entity_id=dispute.id,
        new_value={"evidence_type": evidence_type, "description": description},
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(dispute)
    return _dispute_out(dispute)


@router.patch("/{dispute_id}/status", response_model=DisputeOut)
def update_dispute_status(
    dispute_id: int,
    payload: DisputeStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    agent: User = Depends(require_roles(UserRole.FPO_AGENT, UserRole.ADMIN)),
) -> DisputeOut:
    dispute = db.get(Dispute, dispute_id)
    if dispute is None:
        raise NotFoundError("Dispute not found")
    allowed = _DISPUTE_TRANSITIONS.get(dispute.status, set())
    if payload.status not in allowed:
        raise InvalidStateTransitionError(
            f"Dispute cannot move from {dispute.status.value} to {payload.status.value}"
        )

    old_status = dispute.status
    dispute.status = payload.status
    if payload.proposed_resolution:
        dispute.proposed_resolution = payload.proposed_resolution

    record_audit(
        db,
        actor=agent,
        action="DISPUTE_STATUS_UPDATED",
        entity_type="Dispute",
        entity_id=dispute.id,
        old_value={"status": old_status.value},
        new_value={"status": payload.status.value},
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(dispute)
    return _dispute_out(dispute)


@router.post("/{dispute_id}/resolve", response_model=DisputeOut)
def resolve_dispute(
    dispute_id: int,
    payload: DisputeResolution,
    request: Request,
    db: Session = Depends(get_db),
    agent: User = Depends(require_roles(UserRole.FPO_AGENT, UserRole.ADMIN)),
) -> DisputeOut:
    dispute = db.get(Dispute, dispute_id)
    if dispute is None:
        raise NotFoundError("Dispute not found")
    if dispute.status in (DisputeStatus.RESOLVED, DisputeStatus.REJECTED):
        raise ValidationAppError("This dispute has already been closed")
    if payload.status not in (DisputeStatus.RESOLVED, DisputeStatus.REJECTED):
        raise ValidationAppError("Resolution status must be RESOLVED or REJECTED")

    dispute.status = payload.status
    dispute.final_decision = payload.final_decision
    dispute.financial_adjustment = payload.financial_adjustment
    dispute.resolved_by_user_id = agent.id
    dispute.resolved_at = datetime.now(timezone.utc)

    lot = db.get(Lot, dispute.lot_id)
    if lot.status == LotStatus.DISPUTED and lot.pre_dispute_status:
        target = lot.pre_dispute_status
        assert_transition_allowed(lot.status, target)
        lot.status = target
        lot.pre_dispute_status = None

    if payload.financial_adjustment:
        settlement = db.query(Settlement).filter(Settlement.lot_id == lot.id).first()
        if settlement:
            settlement.total_amount = round(
                settlement.total_amount + payload.financial_adjustment, 2
            )
            settlement.other_deductions = [
                *settlement.other_deductions,
                {
                    "label": f"Dispute {dispute.dispute_code} adjustment",
                    "amount": payload.financial_adjustment,
                },
            ]
            settlement.status = SettlementStatus.DISPUTED

            # Recompute every farmer's itemized line against the adjusted
            # total so the financial impact of the dispute is reflected in
            # what each farmer actually sees, not just the settlement total.
            lines = compute_settlement_items(
                contributors=[
                    ContributorShare(
                        farmer_id=item.farmer_id,
                        quantity_kg=item.contributed_quantity_kg,
                    )
                    for item in settlement.items
                ],
                total_amount=settlement.total_amount,
            )
            lines_by_farmer = {line.farmer_id: line for line in lines}
            for item in settlement.items:
                line = lines_by_farmer[item.farmer_id]
                item.gross_share_amount = line.gross_share_amount
                item.deduction_amount = line.deduction_amount
                item.net_amount = line.net_amount

    record_audit(
        db,
        actor=agent,
        action="DISPUTE_RESOLVED",
        entity_type="Dispute",
        entity_id=dispute.id,
        new_value={
            "status": payload.status.value,
            "final_decision": payload.final_decision,
            "financial_adjustment": payload.financial_adjustment,
        },
        ip_address=get_client_ip(request),
    )
    create_notification(
        db,
        user_id=dispute.raised_by_user_id,
        type="DISPUTE_RESOLVED",
        title="Dispute resolved",
        message=f"Dispute {dispute.dispute_code} has been {payload.status.value.lower()}.",
        entity_type="Dispute",
        entity_id=dispute.id,
    )
    db.commit()
    db.refresh(dispute)
    return _dispute_out(dispute)
