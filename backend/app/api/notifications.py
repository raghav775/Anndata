from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.errors import ForbiddenError, NotFoundError
from app.core.security import InvalidTokenError, decode_token
from app.middleware.deps import get_current_user
from app.models.system import Notification
from app.models.user import User
from app.schemas.system import NotificationOut
from app.services.ws_manager import notification_manager

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Notification]:
    query = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        query = query.filter(Notification.is_read.is_(False))
    return query.order_by(Notification.id.desc()).limit(limit).all()


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Notification:
    notification = db.get(Notification, notification_id)
    if notification is None:
        raise NotFoundError("Notification not found")
    if notification.user_id != user.id:
        raise ForbiddenError("This notification does not belong to you")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.websocket("/ws")
async def notifications_ws(websocket: WebSocket, token: str) -> None:
    """Requires the caller's own JWT access token as a `token` query param —
    a user can only open the socket for their own notification channel."""
    try:
        payload = decode_token(token, expected_type="access")
    except InvalidTokenError:
        await websocket.close(code=4401)
        return

    db = SessionLocal()
    try:
        user = db.get(User, int(payload["sub"]))
    finally:
        db.close()
    if user is None or not user.is_active:
        await websocket.close(code=4401)
        return

    channel = f"notifications:{user.id}"
    await notification_manager.connect(channel, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await notification_manager.disconnect(channel, websocket)
