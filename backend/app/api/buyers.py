from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import NotFoundError
from app.middleware.deps import get_client_ip, get_current_user, require_roles
from app.models.enums import UserRole, VerificationStatus
from app.models.user import BuyerProfile, User
from app.schemas.user import BuyerOut
from app.services.audit import record_audit

router = APIRouter(prefix="/api/buyers", tags=["buyers"])


@router.get("", response_model=list[BuyerOut])
def list_buyers(
    verified_only: bool = False,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[BuyerProfile]:
    query = db.query(BuyerProfile)
    if verified_only:
        query = query.filter(
            BuyerProfile.verification_status == VerificationStatus.VERIFIED
        )
    return query.order_by(BuyerProfile.id).all()


@router.get("/{buyer_id}", response_model=BuyerOut)
def get_buyer(
    buyer_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> BuyerProfile:
    buyer = db.get(BuyerProfile, buyer_id)
    if buyer is None:
        raise NotFoundError("Buyer not found")
    return buyer


@router.patch("/{buyer_id}/verification", response_model=BuyerOut)
def set_buyer_verification(
    buyer_id: int,
    status: VerificationStatus,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> BuyerProfile:
    buyer = db.get(BuyerProfile, buyer_id)
    if buyer is None:
        raise NotFoundError("Buyer not found")
    old_value = {"verification_status": buyer.verification_status.value}
    buyer.verification_status = status
    record_audit(
        db,
        actor=admin,
        action="BUYER_VERIFICATION_CHANGED",
        entity_type="BuyerProfile",
        entity_id=buyer.id,
        old_value=old_value,
        new_value={"verification_status": status.value},
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(buyer)
    return buyer
