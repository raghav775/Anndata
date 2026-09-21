from datetime import datetime

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    actor_user_id: int | None
    actor_role: str | None
    action: str
    entity_type: str
    entity_id: str
    old_value: dict | None
    new_value: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    message: str
    entity_type: str | None
    entity_id: str | None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalyticsOut(BaseModel):
    total_farmers: int
    total_lots: int
    total_quantity_kg: float
    average_net_realization_per_kg: float
    total_transaction_value: float
    pending_settlements: int
    completed_settlements: int
    total_disputes: int
    open_disputes: int
    average_dispute_resolution_hours: float | None
    buyer_fulfillment_rate: float
    active_shipments: int
