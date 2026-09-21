from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import PaymentStatus, SettlementStatus
from app.schemas.common import ORMModel


class PaymentActionRequest(BaseModel):
    amount: float = Field(gt=0)


class PaymentOut(ORMModel):
    id: int
    purchase_order_id: int
    lot_id: int
    buyer_id: int
    amount_due: float
    amount_received: float
    status: PaymentStatus
    transaction_reference: str | None
    initiated_at: datetime | None
    completed_at: datetime | None


class SettlementItemOut(ORMModel):
    id: int
    farmer_id: int
    farmer_name: str | None = None
    contributed_quantity_kg: float
    share_percentage: float
    gross_share_amount: float
    deduction_amount: float
    net_amount: float
    payment_status: str
    paid_at: datetime | None
    transaction_reference: str | None


class SettlementOut(ORMModel):
    id: int
    lot_id: int
    payment_id: int
    total_amount: float
    platform_fee_amount: float
    other_deductions: list
    status: SettlementStatus
    items: list[SettlementItemOut] = []
