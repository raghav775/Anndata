from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.deps import require_roles
from app.models.enums import UserRole
from app.models.user import AssayerProfile, User
from app.schemas.user import AssayerOut

router = APIRouter(prefix="/api/assayers", tags=["assayers"])


@router.get("", response_model=list[AssayerOut])
def list_assayers(
    db: Session = Depends(get_db),
    _user: User = Depends(
        require_roles(UserRole.FPO_AGENT, UserRole.ADMIN, UserRole.ASSAYER)
    ),
) -> list[AssayerProfile]:
    return db.query(AssayerProfile).all()
