from datetime import datetime

from pydantic import BaseModel

from app.models.enums import DisputeStatus
from app.schemas.common import ORMModel


class DisputeCreate(BaseModel):
    lot_id: int
    purchase_order_id: int | None = None
    reason: str


class DisputeEvidenceOut(ORMModel):
    id: int
    evidence_type: str
    file_path: str | None
    sensor_event_id: int | None
    description: str
    uploaded_by_user_id: int
    created_at: datetime


class DisputeOut(ORMModel):
    id: int
    dispute_code: str
    lot_id: int
    purchase_order_id: int | None
    raised_by_user_id: int
    reason: str
    status: DisputeStatus
    proposed_resolution: str | None
    final_decision: str | None
    financial_adjustment: float | None
    resolved_by_user_id: int | None
    resolved_at: datetime | None
    evidence: list[DisputeEvidenceOut] = []


class DisputeEvidenceCreate(BaseModel):
    evidence_type: str
    description: str
    sensor_event_id: int | None = None


class DisputeResolution(BaseModel):
    final_decision: str
    financial_adjustment: float | None = None
    status: DisputeStatus = DisputeStatus.RESOLVED


class DisputeStatusUpdate(BaseModel):
    status: DisputeStatus
    proposed_resolution: str | None = None
