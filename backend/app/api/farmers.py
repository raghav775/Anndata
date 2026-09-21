import secrets

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ForbiddenError, NotFoundError, ValidationAppError
from app.core.security import hash_password
from app.middleware.deps import require_roles
from app.models.enums import UserRole
from app.models.lot import Lot, LotContributor
from app.models.user import FarmerProfile, FPOOrganization, User
from app.schemas.lot import LotOut
from app.schemas.user import FarmerCreate, FarmerOut
from app.services.audit import record_audit

router = APIRouter(prefix="/api/farmers", tags=["farmers"])


class FarmerCreateResponse(BaseModel):
    farmer: FarmerOut
    demo_login_email: str
    demo_login_password: str


def _farmer_out(farmer: FarmerProfile) -> FarmerOut:
    out = FarmerOut.model_validate(farmer)
    out.full_name = farmer.user.full_name
    out.phone = farmer.user.phone
    return out


@router.post("", response_model=FarmerCreateResponse)
def onboard_farmer(
    payload: FarmerCreate,
    db: Session = Depends(get_db),
    agent: User = Depends(require_roles(UserRole.FPO_AGENT, UserRole.ADMIN)),
) -> FarmerCreateResponse:
    fpo = db.get(FPOOrganization, payload.fpo_id)
    if fpo is None:
        raise NotFoundError("FPO not found")

    email = payload.email or f"farmer.{secrets.token_hex(4)}@annadata.demo"
    if db.query(User).filter(User.email == email.lower()).first():
        raise ValidationAppError("A user with this email already exists")

    demo_password = f"Farmer@{secrets.randbelow(9000) + 1000}"
    user = User(
        email=email.lower(),
        hashed_password=hash_password(demo_password),
        role=UserRole.FARMER,
        full_name=payload.full_name,
        phone=payload.phone,
        preferred_language=payload.preferred_language,
        is_synthetic_demo=True,
    )
    db.add(user)
    db.flush()

    farmer = FarmerProfile(
        user_id=user.id,
        fpo_id=payload.fpo_id,
        village=payload.village,
        taluka=payload.taluka,
        district=payload.district,
        state=payload.state,
        land_area_acres=payload.land_area_acres,
    )
    db.add(farmer)
    db.flush()

    record_audit(
        db,
        actor=agent,
        action="FARMER_ONBOARDED",
        entity_type="FarmerProfile",
        entity_id=farmer.id,
        new_value={"full_name": payload.full_name, "fpo_id": payload.fpo_id},
    )
    db.commit()
    db.refresh(farmer)

    return FarmerCreateResponse(
        farmer=_farmer_out(farmer),
        demo_login_email=email.lower(),
        demo_login_password=demo_password,
    )


@router.get("/me", response_model=FarmerOut)
def get_my_farmer_profile(
    db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.FARMER))
) -> FarmerOut:
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user.id).first()
    if farmer is None:
        raise NotFoundError("No farmer profile is associated with this account")
    return _farmer_out(farmer)


@router.get("", response_model=list[FarmerOut])
def list_farmers(
    fpo_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.FPO_AGENT, UserRole.ADMIN)),
) -> list[FarmerOut]:
    query = db.query(FarmerProfile)
    if user.role == UserRole.FPO_AGENT:
        query = query.filter(FarmerProfile.fpo_id == user.fpo_agent_profile.fpo_id)
    elif fpo_id is not None:
        query = query.filter(FarmerProfile.fpo_id == fpo_id)
    return [_farmer_out(f) for f in query.order_by(FarmerProfile.id).all()]


def _assert_can_view_farmer(user: User, farmer: FarmerProfile) -> None:
    if user.role == UserRole.ADMIN:
        return
    if user.role == UserRole.FARMER and farmer.user_id == user.id:
        return
    if (
        user.role == UserRole.FPO_AGENT
        and farmer.fpo_id == user.fpo_agent_profile.fpo_id
    ):
        return
    raise ForbiddenError("You do not have permission to view this farmer's data")


@router.get("/{farmer_id}", response_model=FarmerOut)
def get_farmer(
    farmer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(UserRole.FARMER, UserRole.FPO_AGENT, UserRole.ADMIN)
    ),
) -> FarmerOut:
    farmer = db.get(FarmerProfile, farmer_id)
    if farmer is None:
        raise NotFoundError("Farmer not found")
    _assert_can_view_farmer(user, farmer)
    return _farmer_out(farmer)


@router.get("/{farmer_id}/lots", response_model=list[LotOut])
def get_farmer_lots(
    farmer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(UserRole.FARMER, UserRole.FPO_AGENT, UserRole.ADMIN)
    ),
) -> list[Lot]:
    farmer = db.get(FarmerProfile, farmer_id)
    if farmer is None:
        raise NotFoundError("Farmer not found")
    _assert_can_view_farmer(user, farmer)
    lot_ids = [
        c.lot_id
        for c in db.query(LotContributor)
        .filter(LotContributor.farmer_id == farmer_id)
        .all()
    ]
    if not lot_ids:
        return []
    return db.query(Lot).filter(Lot.id.in_(lot_ids)).order_by(Lot.id.desc()).all()
