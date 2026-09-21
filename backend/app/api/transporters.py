from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.deps import require_roles
from app.models.enums import UserRole
from app.models.user import TransporterProfile, User
from app.schemas.user import TransporterOut

router = APIRouter(prefix="/api/transporters", tags=["transporters"])


@router.get("", response_model=list[TransporterOut])
def list_transporters(
    db: Session = Depends(get_db),
    _user: User = Depends(
        require_roles(UserRole.FPO_AGENT, UserRole.ADMIN, UserRole.TRANSPORTER)
    ),
) -> list[TransporterProfile]:
    return db.query(TransporterProfile).all()
