from __future__ import annotations

from sqlalchemy import JSON, Boolean, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Commodity(Base, TimestampMixin):
    __tablename__ = "commodities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    variety: Mapped[str | None] = mapped_column(String(120), nullable=True)
    unit: Mapped[str] = mapped_column(String(10), default="kg")
    # Commodity-specific storage guidance (e.g. onion needs ventilated, dry
    # storage rather than a universal cold-chain assumption). Data, not a
    # hardcoded rule, so future crops can be added without code changes.
    storage_guidelines: Mapped[dict] = mapped_column(JSON, default=dict)


class StorageFacility(Base, TimestampMixin):
    """A third-party storage facility that AnnData coordinates with.

    AnnData does not own or operate this facility — records here reflect
    visibility/coordination data supplied by the operator.
    """

    __tablename__ = "storage_facilities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    operator_name: Mapped[str] = mapped_column(String(255), nullable=False)
    village: Mapped[str] = mapped_column(String(120), nullable=False)
    district: Mapped[str] = mapped_column(String(120), nullable=False)
    state: Mapped[str] = mapped_column(String(120), nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_capacity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    available_capacity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    ventilation_type: Mapped[str] = mapped_column(
        String(120), default="Naturally ventilated"
    )
    tariff_per_kg_per_day: Mapped[float] = mapped_column(Float, default=0.0)
    commodity_compatibility: Mapped[list] = mapped_column(JSON, default=list)
    insurance_provider: Mapped[str | None] = mapped_column(String(255), nullable=True)
    liability_notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    last_inspection_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    incident_status: Mapped[str] = mapped_column(String(20), default="NONE")
    is_synthetic_demo: Mapped[bool] = mapped_column(Boolean, default=False)
