from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import NotFoundError
from app.middleware.deps import get_client_ip, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import UserOut
from app.services.audit import record_audit

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    role: UserRole | None = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[User]:
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.id).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found")
    return user


@router.patch("/{user_id}/status", response_model=UserOut)
def set_user_status(
    user_id: int,
    is_active: bool,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found")
    old_value = {"is_active": user.is_active}
    user.is_active = is_active
    record_audit(
        db,
        actor=admin,
        action="USER_STATUS_CHANGED",
        entity_type="User",
        entity_id=user.id,
        old_value=old_value,
        new_value={"is_active": is_active},
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(user)
    return user
