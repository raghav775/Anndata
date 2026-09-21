from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import OfferStatus, OfferType, POStatus
from app.models.mixins import TimestampMixin


class Offer(Base, TimestampMixin):
    """A buyer offer against a lot.

    Deduction fields make up the transparent breakdown used by the net
    realizable price engine (see app/services/net_price.py). Gross price
    alone must never be used to rank offers.
    """

    __tablename__ = "offers"

    id: Mapped[int] = mapped_column(primary_key=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id"), nullable=False)
    buyer_id: Mapped[int] = mapped_column(
        ForeignKey("buyer_profiles.id"), nullable=False
    )
    offer_type: Mapped[OfferType] = mapped_column(
        Enum(OfferType), default=OfferType.INDICATIVE
    )
    status: Mapped[OfferStatus] = mapped_column(
        Enum(OfferStatus), default=OfferStatus.ACTIVE
    )

    gross_price_per_kg: Mapped[float] = mapped_column(Float, nullable=False)
    required_quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    required_grade: Mapped[str] = mapped_column(String(20), nullable=False)

    transport_cost_per_kg: Mapped[float] = mapped_column(Float, default=0.0)
    loading_unloading_per_kg: Mapped[float] = mapped_column(Float, default=0.0)
    grading_fee_per_kg: Mapped[float] = mapped_column(Float, default=0.0)
    storage_cost_per_kg: Mapped[float] = mapped_column(Float, default=0.0)
    platform_fee_per_kg: Mapped[float] = mapped_column(Float, default=0.0)
    other_deductions: Mapped[list] = mapped_column(JSON, default=list)

    delivery_terms: Mapped[str | None] = mapped_column(String(500), nullable=True)
    payment_timeline_days: Mapped[int] = mapped_column(Integer, default=7)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    lot: Mapped["Lot"] = relationship()  # noqa: F821
    buyer: Mapped["BuyerProfile"] = relationship()  # noqa: F821


class PurchaseOrder(Base, TimestampMixin):
    """A finalized purchase order created when the FPO accepts an offer.

    Deduction/tolerance data is copied from the accepted offer at creation
    time so the contract terms are immutable even if the offer record is
    later modified.
    """

    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    po_number: Mapped[str] = mapped_column(
        String(40), unique=True, nullable=False, index=True
    )
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id"), nullable=False)
    offer_id: Mapped[int] = mapped_column(ForeignKey("offers.id"), nullable=False)
    buyer_id: Mapped[int] = mapped_column(
        ForeignKey("buyer_profiles.id"), nullable=False
    )
    fpo_id: Mapped[int] = mapped_column(
        ForeignKey("fpo_organizations.id"), nullable=False
    )

    quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    contracted_grade: Mapped[str] = mapped_column(String(20), nullable=False)

    gross_price_per_kg: Mapped[float] = mapped_column(Float, nullable=False)
    deductions: Mapped[dict] = mapped_column(JSON, default=dict)
    net_price_per_kg: Mapped[float] = mapped_column(Float, nullable=False)

    tolerance_rules: Mapped[list] = mapped_column(JSON, default=list)
    reject_below_grade: Mapped[str] = mapped_column(String(20), default="C")
    contamination_auto_reject: Mapped[bool] = mapped_column(Boolean, default=True)

    delivery_location: Mapped[str] = mapped_column(String(255), nullable=False)
    payment_deadline_days: Mapped[int] = mapped_column(Integer, default=7)
    inspection_deadline_days: Mapped[int] = mapped_column(Integer, default=2)
    transport_responsibility: Mapped[str] = mapped_column(
        String(120), default="FPO-coordinated"
    )
    storage_responsibility: Mapped[str] = mapped_column(
        String(120), default="Buyer, post-delivery"
    )
    dispute_procedure: Mapped[str] = mapped_column(
        String(1000),
        default=(
            "Either party may raise a dispute within the inspection deadline. "
            "Disputes are resolved using stored lot, quality, weight, delivery "
            "and photographic evidence by FPO/AnnData administration."
        ),
    )
    status: Mapped[POStatus] = mapped_column(Enum(POStatus), default=POStatus.ISSUED)

    lot: Mapped["Lot"] = relationship()  # noqa: F821
    offer: Mapped["Offer"] = relationship()
    buyer: Mapped["BuyerProfile"] = relationship()  # noqa: F821
