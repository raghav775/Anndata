from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import PaymentStatus, SettlementStatus
from app.models.mixins import TimestampMixin


class Payment(Base, TimestampMixin):
    """A mock payment record. No real money moves through this platform."""

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(
        ForeignKey("purchase_orders.id"), unique=True, nullable=False
    )
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id"), nullable=False)
    buyer_id: Mapped[int] = mapped_column(
        ForeignKey("buyer_profiles.id"), nullable=False
    )

    amount_due: Mapped[float] = mapped_column(Float, nullable=False)
    amount_received: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus), default=PaymentStatus.PAYMENT_PENDING
    )
    transaction_reference: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True
    )
    initiated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    lot: Mapped["Lot"] = relationship()  # noqa: F821
    buyer: Mapped["BuyerProfile"] = relationship()  # noqa: F821


class Settlement(Base, TimestampMixin):
    __tablename__ = "settlements"

    id: Mapped[int] = mapped_column(primary_key=True)
    lot_id: Mapped[int] = mapped_column(
        ForeignKey("lots.id"), unique=True, nullable=False
    )
    payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id"), nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    platform_fee_amount: Mapped[float] = mapped_column(Float, default=0.0)
    other_deductions: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[SettlementStatus] = mapped_column(
        Enum(SettlementStatus), default=SettlementStatus.PENDING
    )

    lot: Mapped["Lot"] = relationship()  # noqa: F821
    items: Mapped[list["SettlementItem"]] = relationship(
        back_populates="settlement", cascade="all, delete-orphan"
    )


class SettlementItem(Base, TimestampMixin):
    """Itemized per-farmer settlement line — every farmer sees exactly this."""

    __tablename__ = "settlement_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    settlement_id: Mapped[int] = mapped_column(
        ForeignKey("settlements.id"), nullable=False
    )
    farmer_id: Mapped[int] = mapped_column(
        ForeignKey("farmer_profiles.id"), nullable=False
    )
    contributed_quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    share_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    gross_share_amount: Mapped[float] = mapped_column(Float, nullable=False)
    deduction_amount: Mapped[float] = mapped_column(Float, default=0.0)
    net_amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_status: Mapped[str] = mapped_column(String(20), default="PENDING")
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    transaction_reference: Mapped[str | None] = mapped_column(String(64), nullable=True)

    settlement: Mapped["Settlement"] = relationship(back_populates="items")
    farmer: Mapped["FarmerProfile"] = relationship()  # noqa: F821
