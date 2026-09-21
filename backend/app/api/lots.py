from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.errors import ForbiddenError, NotFoundError, ValidationAppError
from app.middleware.deps import get_client_ip, get_current_user, require_roles
from app.models.enums import Grade, LotStatus, UserRole
from app.models.lot import Lot, LotContributor, PreliminaryScreening, QualityAssessment
from app.models.logistics import Shipment
from app.models.user import AssayerProfile, FarmerProfile, User
from app.schemas.lot import (
    LotCreate,
    LotOut,
    QualityAssessmentIn,
    QualityAssessmentOut,
    ScreeningOut,
)
from app.services.audit import record_audit
from app.services.codes import generate_lot_code
from app.services.lot_state import assert_transition_allowed
from app.services.screening import run_preliminary_screening

router = APIRouter(prefix="/api/lots", tags=["lots"])


def _lot_out(lot: Lot) -> LotOut:
    out = LotOut.model_validate(lot)
    for i, contributor in enumerate(lot.contributors):
        out.contributors[i].farmer_name = contributor.farmer.user.full_name
    return out


def _visible_lots_query(db: Session, user: User):
    query = db.query(Lot).options(
        joinedload(Lot.contributors)
        .joinedload(LotContributor.farmer)
        .joinedload(FarmerProfile.user)
    )
    if user.role == UserRole.ADMIN:
        return query
    if user.role == UserRole.FPO_AGENT:
        return query.filter(Lot.fpo_id == user.fpo_agent_profile.fpo_id)
    if user.role == UserRole.FARMER:
        farmer = user.farmer_profile
        lot_ids = [
            c.lot_id
            for c in db.query(LotContributor).filter(
                LotContributor.farmer_id == farmer.id
            )
        ]
        return query.filter(Lot.id.in_(lot_ids or [-1]))
    if user.role == UserRole.ASSAYER:
        return query.filter(
            Lot.status.in_(
                [LotStatus.COLLECTED, LotStatus.UNDER_ASSESSMENT, LotStatus.ASSESSED]
            )
        )
    if user.role == UserRole.BUYER:
        return query.filter(
            Lot.status.in_(
                [
                    LotStatus.OPEN_FOR_OFFERS,
                    LotStatus.OFFER_ACCEPTED,
                    LotStatus.PURCHASE_ORDER_CREATED,
                    LotStatus.DISPATCHED,
                    LotStatus.DELIVERED,
                    LotStatus.SETTLED,
                    LotStatus.DISPUTED,
                ]
            )
        )
    if user.role == UserRole.TRANSPORTER:
        lot_ids = [
            s.lot_id
            for s in db.query(Shipment).filter(
                Shipment.transporter_id == user.transporter_profile.id
            )
        ]
        return query.filter(Lot.id.in_(lot_ids or [-1]))
    return query.filter(False)


def _assert_can_view_lot(db: Session, user: User, lot: Lot) -> None:
    visible_ids = {row.id for row in _visible_lots_query(db, user).all()}
    if lot.id not in visible_ids:
        raise ForbiddenError("You do not have permission to view this lot")


@router.post("", response_model=LotOut)
def create_lot(
    payload: LotCreate,
    request: Request,
    db: Session = Depends(get_db),
    agent: User = Depends(require_roles(UserRole.FPO_AGENT, UserRole.ADMIN)),
) -> LotOut:
    if user_fpo := getattr(agent.fpo_agent_profile, "fpo_id", None):
        if payload.fpo_id != user_fpo and agent.role != UserRole.ADMIN:
            raise ForbiddenError("You may only create lots for your own FPO")

    for c in payload.contributors:
        farmer = db.get(FarmerProfile, c.farmer_id)
        if farmer is None:
            raise ValidationAppError(f"Farmer {c.farmer_id} not found")

    total_quantity = sum(c.quantity_kg for c in payload.contributors)
    lot = Lot(
        lot_code=generate_lot_code(db),
        commodity_id=payload.commodity_id,
        variety=payload.variety,
        fpo_id=payload.fpo_id,
        village_origin=payload.village_origin,
        collection_point=payload.collection_point,
        expected_harvest_date=payload.expected_harvest_date,
        total_quantity_kg=total_quantity,
        status=LotStatus.DRAFT,
        created_by_user_id=agent.id,
    )
    db.add(lot)
    db.flush()

    for c in payload.contributors:
        db.add(
            LotContributor(
                lot_id=lot.id, farmer_id=c.farmer_id, quantity_kg=c.quantity_kg
            )
        )

    record_audit(
        db,
        actor=agent,
        action="LOT_CREATED",
        entity_type="Lot",
        entity_id=lot.id,
        new_value={"lot_code": lot.lot_code, "total_quantity_kg": total_quantity},
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(lot)
    return _lot_out(lot)


@router.get("", response_model=list[LotOut])
def list_lots(
    status_filter: LotStatus | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[LotOut]:
    query = _visible_lots_query(db, user)
    if status_filter:
        query = query.filter(Lot.status == status_filter)
    lots = query.order_by(Lot.id.desc()).all()
    return [_lot_out(lot) for lot in lots]


@router.get("/{lot_id}", response_model=LotOut)
def get_lot(
    lot_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> LotOut:
    lot = db.get(Lot, lot_id)
    if lot is None:
        raise NotFoundError("Lot not found")
    _assert_can_view_lot(db, user, lot)
    return _lot_out(lot)


@router.get("/{lot_id}/screening", response_model=ScreeningOut)
def get_screening(
    lot_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> PreliminaryScreening:
    lot = db.get(Lot, lot_id)
    if lot is None or lot.preliminary_screening is None:
        raise NotFoundError("No preliminary screening exists yet for this lot")
    _assert_can_view_lot(db, user, lot)
    return lot.preliminary_screening


@router.get("/{lot_id}/assessment", response_model=QualityAssessmentOut)
def get_assessment(
    lot_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> QualityAssessment:
    lot = db.get(Lot, lot_id)
    if lot is None or lot.quality_assessment is None:
        raise NotFoundError("No quality assessment exists yet for this lot")
    _assert_can_view_lot(db, user, lot)
    return lot.quality_assessment


@router.post("/{lot_id}/collect", response_model=LotOut)
def mark_collected(
    lot_id: int,
    request: Request,
    db: Session = Depends(get_db),
    agent: User = Depends(require_roles(UserRole.FPO_AGENT, UserRole.ADMIN)),
) -> LotOut:
    lot = db.get(Lot, lot_id)
    if lot is None:
        raise NotFoundError("Lot not found")
    assert_transition_allowed(lot.status, LotStatus.COLLECTED)
    old_status = lot.status
    lot.status = LotStatus.COLLECTED
    record_audit(
        db,
        actor=agent,
        action="LOT_COLLECTED",
        entity_type="Lot",
        entity_id=lot.id,
        old_value={"status": old_status.value},
        new_value={"status": lot.status.value},
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(lot)
    return _lot_out(lot)


@router.post("/{lot_id}/screen", response_model=ScreeningOut)
def run_screening(
    lot_id: int,
    request: Request,
    db: Session = Depends(get_db),
    agent: User = Depends(require_roles(UserRole.FPO_AGENT, UserRole.ADMIN)),
) -> PreliminaryScreening:
    lot = db.get(Lot, lot_id)
    if lot is None:
        raise NotFoundError("Lot not found")
    assert_transition_allowed(lot.status, LotStatus.UNDER_ASSESSMENT)
    if lot.preliminary_screening is not None:
        raise ValidationAppError("Preliminary screening has already run for this lot")

    result = run_preliminary_screening(lot.lot_code, lot.total_quantity_kg)
    screening = PreliminaryScreening(
        lot_id=lot.id,
        predicted_grade=result.predicted_grade,
        confidence_score=result.confidence_score,
        defect_flags=result.defect_flags,
        model_version=result.model_version,
        disclaimer=result.disclaimer,
    )
    db.add(screening)
    lot.preliminary_grade = result.predicted_grade
    lot.status = LotStatus.UNDER_ASSESSMENT

    record_audit(
        db,
        actor=agent,
        action="LOT_PRELIMINARY_SCREENED",
        entity_type="Lot",
        entity_id=lot.id,
        new_value={
            "predicted_grade": result.predicted_grade,
            "confidence_score": result.confidence_score,
        },
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(screening)
    return screening


@router.post("/{lot_id}/assessment", response_model=QualityAssessmentOut)
def finalize_assessment(
    lot_id: int,
    payload: QualityAssessmentIn,
    request: Request,
    db: Session = Depends(get_db),
    assayer_user: User = Depends(require_roles(UserRole.ASSAYER, UserRole.ADMIN)),
) -> QualityAssessment:
    lot = db.get(Lot, lot_id)
    if lot is None:
        raise NotFoundError("Lot not found")
    assert_transition_allowed(lot.status, LotStatus.ASSESSED)
    if lot.quality_assessment is not None:
        raise ValidationAppError("This lot already has a finalized quality assessment")

    assayer_profile = (
        db.query(AssayerProfile)
        .filter(AssayerProfile.user_id == assayer_user.id)
        .first()
    )
    if assayer_profile is None:
        raise ValidationAppError("This user has no assayer profile")

    assessment = QualityAssessment(
        lot_id=lot.id,
        assayer_id=assayer_profile.id,
        sample_quantity_kg=payload.sample_quantity_kg,
        final_weight_kg=payload.final_weight_kg,
        final_grade=payload.final_grade,
        visible_defects=payload.visible_defects,
        quality_notes=payload.quality_notes,
        is_finalized=True,
        finalized_at=datetime.now(timezone.utc),
    )
    db.add(assessment)
    lot.final_grade = payload.final_grade
    lot.status = LotStatus.ASSESSED

    record_audit(
        db,
        actor=assayer_user,
        action="QUALITY_ASSESSMENT_FINALIZED",
        entity_type="Lot",
        entity_id=lot.id,
        new_value={
            "final_grade": payload.final_grade.value,
            "final_weight_kg": payload.final_weight_kg,
        },
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(assessment)
    return assessment


class AssessmentCorrection(BaseModel):
    final_weight_kg: float | None = None
    final_grade: Grade | None = None
    quality_notes: str | None = None
    correction_reason: str


@router.patch("/{lot_id}/assessment/correct", response_model=QualityAssessmentOut)
def correct_assessment(
    lot_id: int,
    payload: AssessmentCorrection,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.ASSAYER, UserRole.ADMIN)),
) -> QualityAssessment:
    """A finalized assessment cannot be silently edited. This endpoint is the
    only way to change one after finalization, and it always writes an audit
    entry recording the reason and the before/after values."""
    lot = db.get(Lot, lot_id)
    if lot is None or lot.quality_assessment is None:
        raise NotFoundError("Finalized quality assessment not found for this lot")
    assessment = lot.quality_assessment

    old_value = {
        "final_weight_kg": assessment.final_weight_kg,
        "final_grade": assessment.final_grade.value,
        "quality_notes": assessment.quality_notes,
    }
    if payload.final_weight_kg is not None:
        assessment.final_weight_kg = payload.final_weight_kg
    if payload.final_grade is not None:
        assessment.final_grade = payload.final_grade
        lot.final_grade = payload.final_grade
    if payload.quality_notes is not None:
        assessment.quality_notes = payload.quality_notes

    record_audit(
        db,
        actor=actor,
        action="QUALITY_ASSESSMENT_CORRECTED",
        entity_type="QualityAssessment",
        entity_id=assessment.id,
        old_value=old_value,
        new_value={
            "final_weight_kg": assessment.final_weight_kg,
            "final_grade": assessment.final_grade.value,
            "quality_notes": assessment.quality_notes,
            "reason": payload.correction_reason,
        },
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(assessment)
    return assessment


@router.post("/{lot_id}/open-for-offers", response_model=LotOut)
def open_for_offers(
    lot_id: int,
    request: Request,
    db: Session = Depends(get_db),
    agent: User = Depends(require_roles(UserRole.FPO_AGENT, UserRole.ADMIN)),
) -> LotOut:
    lot = db.get(Lot, lot_id)
    if lot is None:
        raise NotFoundError("Lot not found")
    assert_transition_allowed(lot.status, LotStatus.OPEN_FOR_OFFERS)
    lot.status = LotStatus.OPEN_FOR_OFFERS

    record_audit(
        db,
        actor=agent,
        action="LOT_OPENED_FOR_OFFERS",
        entity_type="Lot",
        entity_id=lot.id,
        new_value={"status": lot.status.value},
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(lot)
    return _lot_out(lot)
