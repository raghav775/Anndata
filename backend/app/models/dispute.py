from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import DisputeStatus
from app.models.mixins import TimestampMixin


class Dispute(Base, TimestampMixin):
    __tablename__ = "disputes"

    id: Mapped[int] = mapped_column(primary_key=True)
    dispute_code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id"), nullable=False)
    purchase_order_id: Mapped[int | None] = mapped_column(
        ForeignKey("purchase_orders.id"), nullable=True
    )
    raised_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    reason: Mapped[str] = mapped_column(String(2000), nullable=False)
    status: Mapped[DisputeStatus] = mapped_column(
        Enum(DisputeStatus), default=DisputeStatus.OPEN
    )
    proposed_resolution: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    final_decision: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    financial_adjustment: Mapped[float | None] = mapped_column(Float, nullable=True)
    resolved_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    lot: Mapped["Lot"] = relationship()  # noqa: F821
    purchase_order: Mapped["PurchaseOrder | None"] = relationship()  # noqa: F821
    evidence: Mapped[list["DisputeEvidence"]] = relationship(
        back_populates="dispute", cascade="all, delete-orphan"
    )


class DisputeEvidence(Base, TimestampMixin):
    __tablename__ = "dispute_evidence"

    id: Mapped[int] = mapped_column(primary_key=True)
    dispute_id: Mapped[int] = mapped_column(ForeignKey("disputes.id"), nullable=False)
    evidence_type: Mapped[str] = mapped_column(String(30), nullable=False)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sensor_event_id: Mapped[int | None] = mapped_column(
        ForeignKey("storage_events.id"), nullable=True
    )
    description: Mapped[str] = mapped_column(String(1000), nullable=False)
    uploaded_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )

    dispute: Mapped["Dispute"] = relationship(back_populates="evidence")
