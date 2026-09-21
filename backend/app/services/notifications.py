"""Notification creation + real-time push.

The DB write always happens (so polling clients never miss anything); the
WebSocket push is a best-effort real-time convenience on top of it.
"""

from sqlalchemy.orm import Session

from app.models.system import Notification


def create_notification(
    db: Session,
    *,
    user_id: int,
    type: str,
    title: str,
    message: str,
    entity_type: str | None = None,
    entity_id: int | str | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
    )
    db.add(notification)
    db.flush()
    return notification


def notification_to_payload(notification: Notification) -> dict:
    return {
        "id": notification.id,
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "entity_type": notification.entity_type,
        "entity_id": notification.entity_id,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat(),
    }
