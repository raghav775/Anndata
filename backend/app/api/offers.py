from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ForbiddenError, NotFoundError, ValidationAppError
from app.middleware.deps import get_client_ip, get_current_user, require_roles
from app.models.enums import LotStatus, OfferStatus, UserRole, VerificationStatus
from app.models.lot import Lot
from app.models.marketplace import Offer
from app.models.user import BuyerProfile, User
from app.schemas.marketplace import OfferComparisonOut, OfferCreate, OfferOut
from app.services.audit import record_audit
from app.services.net_price import (
    build_comparison_explanation,
    rank_offers_by_net_realization,
)
from app.services.notifications import create_notification

router = APIRouter(prefix="/api/offers", tags=["offers"])


def _offer_to_dict(offer: Offer) -> dict:
    return {
        "id": offer.id,
        "lot_id": offer.lot_id,
        "buyer_id": offer.buyer_id,
        "buyer_name": offer.buyer.organization_name,
        "offer_type": offer.offer_type,
        "status": offer.status,
        "gross_price_per_kg": offer.gross_price_per_kg,
        "required_quantity_kg": offer.required_quantity_kg,
        "required_grade": offer.required_grade,
        "transport_cost_per_kg": offer.transport_cost_per_kg,
        "loading_unloading_per_kg": offer.loading_unloading_per_kg,
        "grading_fee_per_kg": offer.grading_fee_per_kg,
        "storage_cost_per_kg": offer.storage_cost_per_kg,
        "platform_fee_per_kg": offer.platform_fee_per_kg,
        "other_deductions": offer.other_deductions,
        "delivery_terms": offer.delivery_terms,
        "payment_timeline_days": offer.payment_timeline_days,
        "expires_at": offer.expires_at,
    }


@router.post("", response_model=OfferOut)
def create_offer(
    payload: OfferCreate,
    request: Request,
    db: Session = Depends(get_db),
    buyer_user: User = Depends(require_roles(UserRole.BUYER)),
) -> OfferOut:
    lot = db.get(Lot, payload.lot_id)
    if lot is None:
        raise NotFoundError("Lot not found")
    if lot.status != LotStatus.OPEN_FOR_OFFERS:
        raise ValidationAppError("This lot is not currently open for offers")

    buyer_profile = (
        db.query(BuyerProfile).filter(BuyerProfile.user_id == buyer_user.id).first()
    )
    if buyer_profile is None:
        raise ValidationAppError("This user has no buyer profile")
    if buyer_profile.verification_status != VerificationStatus.VERIFIED:
        raise ForbiddenError("Only verified buyers may submit offers")

    offer = Offer(
        lot_id=payload.lot_id,
        buyer_id=buyer_profile.id,
        offer_type=payload.offer_type,
        gross_price_per_kg=payload.gross_price_per_kg,
        required_quantity_kg=payload.required_quantity_kg,
        required_grade=payload.required_grade,
        transport_cost_per_kg=payload.transport_cost_per_kg,
        loading_unloading_per_kg=payload.loading_unloading_per_kg,
        grading_fee_per_kg=payload.grading_fee_per_kg,
        storage_cost_per_kg=payload.storage_cost_per_kg,
        platform_fee_per_kg=payload.platform_fee_per_kg,
        other_deductions=[d.model_dump() for d in payload.other_deductions],
        delivery_terms=payload.delivery_terms,
        payment_timeline_days=payload.payment_timeline_days,
        expires_at=payload.expires_at,
    )
    db.add(offer)
    db.flush()

    record_audit(
        db,
        actor=buyer_user,
        action="OFFER_SUBMITTED",
        entity_type="Offer",
        entity_id=offer.id,
        new_value={"lot_id": lot.id, "gross_price_per_kg": payload.gross_price_per_kg},
        ip_address=get_client_ip(request),
    )

    for agent_user_id in _fpo_agent_user_ids(db, lot.fpo_id):
        create_notification(
            db,
            user_id=agent_user_id,
            type="OFFER_RECEIVED",
            title="New buyer offer",
            message=f"{buyer_profile.organization_name} submitted an offer on lot {lot.lot_code}.",
            entity_type="Lot",
            entity_id=lot.id,
        )

    db.commit()
    db.refresh(offer)
    ranked = rank_offers_by_net_realization([_offer_to_dict(offer)])
    return OfferOut(**ranked[0])


def _fpo_agent_user_ids(db: Session, fpo_id: int) -> list[int]:
    from app.models.user import FPOAgentProfile

    return [
        row.user_id
        for row in db.query(FPOAgentProfile)
        .filter(FPOAgentProfile.fpo_id == fpo_id)
        .all()
    ]


@router.get("/lot/{lot_id}", response_model=OfferComparisonOut)
def compare_offers_for_lot(
    lot_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> OfferComparisonOut:
    lot = db.get(Lot, lot_id)
    if lot is None:
        raise NotFoundError("Lot not found")

    offers = db.query(Offer).filter(Offer.lot_id == lot_id).all()
    ranked = rank_offers_by_net_realization([_offer_to_dict(o) for o in offers])
    explanation = build_comparison_explanation(ranked)
    best_id = ranked[0]["id"] if ranked else None
    return OfferComparisonOut(
        offers=[OfferOut(**o) for o in ranked],
        best_offer_id=best_id,
        explanation=explanation,
    )


@router.post("/{offer_id}/accept", response_model=OfferOut)
def accept_offer(
    offer_id: int,
    request: Request,
    db: Session = Depends(get_db),
    agent: User = Depends(require_roles(UserRole.FPO_AGENT, UserRole.ADMIN)),
) -> OfferOut:
    offer = db.get(Offer, offer_id)
    if offer is None:
        raise NotFoundError("Offer not found")
    lot = db.get(Lot, offer.lot_id)
    if lot.status != LotStatus.OPEN_FOR_OFFERS:
        raise ValidationAppError("This lot is not open for offers")
    if offer.status != OfferStatus.ACTIVE:
        raise ValidationAppError("Only an active offer can be accepted")

    offer.status = OfferStatus.ACCEPTED
    for other in db.query(Offer).filter(Offer.lot_id == lot.id, Offer.id != offer.id):
        if other.status == OfferStatus.ACTIVE:
            other.status = OfferStatus.REJECTED
    lot.status = LotStatus.OFFER_ACCEPTED

    record_audit(
        db,
        actor=agent,
        action="OFFER_ACCEPTED",
        entity_type="Offer",
        entity_id=offer.id,
        new_value={"lot_id": lot.id},
        ip_address=get_client_ip(request),
    )
    create_notification(
        db,
        user_id=offer.buyer.user_id,
        type="OFFER_ACCEPTED",
        title="Your offer was accepted",
        message=f"Your offer on lot {lot.lot_code} was accepted by the FPO.",
        entity_type="Lot",
        entity_id=lot.id,
    )
    db.commit()
    db.refresh(offer)
    ranked = rank_offers_by_net_realization([_offer_to_dict(offer)])
    return OfferOut(**ranked[0])
