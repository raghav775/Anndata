from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import OfferStatus, OfferType, POStatus
from app.schemas.common import ORMModel


class DeductionItem(BaseModel):
    label: str
    amount_per_kg: float


class OfferCreate(BaseModel):
    lot_id: int
    offer_type: OfferType = OfferType.INDICATIVE
    gross_price_per_kg: float = Field(gt=0)
    required_quantity_kg: float = Field(gt=0)
    required_grade: str
    transport_cost_per_kg: float = Field(default=0, ge=0)
    loading_unloading_per_kg: float = Field(default=0, ge=0)
    grading_fee_per_kg: float = Field(default=0, ge=0)
    storage_cost_per_kg: float = Field(default=0, ge=0)
    platform_fee_per_kg: float = Field(default=0, ge=0)
    other_deductions: list[DeductionItem] = []
    delivery_terms: str | None = None
    payment_timeline_days: int = Field(default=7, ge=0)
    expires_at: datetime | None = None


class OfferOut(ORMModel):
    id: int
    lot_id: int
    buyer_id: int
    buyer_name: str | None = None
    offer_type: OfferType
    status: OfferStatus
    gross_price_per_kg: float
    required_quantity_kg: float
    required_grade: str
    transport_cost_per_kg: float
    loading_unloading_per_kg: float
    grading_fee_per_kg: float
    storage_cost_per_kg: float
    platform_fee_per_kg: float
    other_deductions: list
    delivery_terms: str | None
    payment_timeline_days: int
    expires_at: datetime | None
    total_deductions_per_kg: float
    net_price_per_kg: float
    expected_net_realization: float


class OfferComparisonOut(BaseModel):
    """Ranked by net realization, never by gross price alone."""

    offers: list[OfferOut]
    best_offer_id: int | None
    explanation: str


class ToleranceRule(BaseModel):
    grade: str
    price_multiplier: float = Field(ge=0, le=1)
    note: str | None = None


class PurchaseOrderCreate(BaseModel):
    offer_id: int
    delivery_location: str
    payment_deadline_days: int = Field(default=7, ge=1)
    inspection_deadline_days: int = Field(default=2, ge=1)
    transport_responsibility: str = "FPO-coordinated"
    storage_responsibility: str = "Buyer, post-delivery"
    tolerance_rules: list[ToleranceRule] = Field(
        default_factory=lambda: [
            ToleranceRule(
                grade="A", price_multiplier=1.0, note="Full contracted price"
            ),
            ToleranceRule(
                grade="B",
                price_multiplier=0.92,
                note="Pre-agreed reduced price within tolerance",
            ),
            ToleranceRule(
                grade="C",
                price_multiplier=0.75,
                note="Secondary/negotiated step-down for lower usable grade",
            ),
        ]
    )
    reject_below_grade: str = "C"
    contamination_auto_reject: bool = True


class PurchaseOrderOut(ORMModel):
    id: int
    po_number: str
    lot_id: int
    offer_id: int
    buyer_id: int
    fpo_id: int
    quantity_kg: float
    contracted_grade: str
    gross_price_per_kg: float
    deductions: dict
    net_price_per_kg: float
    tolerance_rules: list
    reject_below_grade: str
    contamination_auto_reject: bool
    delivery_location: str
    payment_deadline_days: int
    inspection_deadline_days: int
    transport_responsibility: str
    storage_responsibility: str
    dispute_procedure: str
    status: POStatus
