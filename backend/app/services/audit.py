"""Append-only audit logging helper.

Every service function that mutates important state should call
`record_audit` in the same DB transaction as the mutation. There is no
update/delete path exposed for AuditLog anywhere in the API.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.models.system import AuditLog
from app.models.user import User


def record_audit(
    db: Session,
    *,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: int | str,
    old_value: dict[str, Any] | None = None,
    new_value: dict[str, Any] | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        actor_user_id=actor.id if actor else None,
        actor_role=actor.role.value if actor else "SYSTEM",
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    db.flush()
    return entry
