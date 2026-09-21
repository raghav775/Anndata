from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import Grade, LotStatus
from app.models.mixins import TimestampMixin


class Lot(Base, TimestampMixin):
    __tablename__ = "lots"

    id: Mapped[int] = mapped_column(primary_key=True)
    lot_code: Mapped[str] = mapped_column(
        String(40), unique=True, nullable=False, index=True
    )
    commodity_id: Mapped[int] = mapped_column(
        ForeignKey("commodities.id"), nullable=False
    )
    variety: Mapped[str | None] = mapped_column(String(120), nullable=True)
    fpo_id: Mapped[int] = mapped_column(
        ForeignKey("fpo_organizations.id"), nullable=False
    )
    village_origin: Mapped[str] = mapped_column(String(120), nullable=False)
    collection_point: Mapped[str] = mapped_column(String(255), nullable=False)
    expected_harvest_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    total_quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    preliminary_grade: Mapped[str | None] = mapped_column(String(20), nullable=True)
    final_grade: Mapped[Grade | None] = mapped_column(Enum(Grade), nullable=True)
    status: Mapped[LotStatus] = mapped_column(
        Enum(LotStatus), default=LotStatus.DRAFT, nullable=False, index=True
    )
    pre_dispute_status: Mapped[LotStatus | None] = mapped_column(
        Enum(LotStatus), nullable=True
    )
    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    is_synthetic_demo: Mapped[bool] = mapped_column(Boolean, default=False)

    fpo: Mapped["FPOOrganization"] = relationship()  # noqa: F821
    contributors: Mapped[list["LotContributor"]] = relationship(
        back_populates="lot", cascade="all, delete-orphan"
    )
    media: Mapped[list["LotMedia"]] = relationship(
        back_populates="lot", cascade="all, delete-orphan"
    )
    preliminary_screening: Mapped["PreliminaryScreening | None"] = relationship(
        back_populates="lot", uselist=False, cascade="all, delete-orphan"
    )
    quality_assessment: Mapped["QualityAssessment | None"] = relationship(
        back_populates="lot", uselist=False, cascade="all, delete-orphan"
    )


class LotContributor(Base, TimestampMixin):
    __tablename__ = "lot_contributors"
    __table_args__ = (UniqueConstraint("lot_id", "farmer_id", name="uq_lot_farmer"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id"), nullable=False)
    farmer_id: Mapped[int] = mapped_column(
        ForeignKey("farmer_profiles.id"), nullable=False
    )
    quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)

    lot: Mapped["Lot"] = relationship(back_populates="contributors")
    farmer: Mapped["FarmerProfile"] = relationship()  # noqa: F821


class LotMedia(Base, TimestampMixin):
    __tablename__ = "lot_media"

    id: Mapped[int] = mapped_column(primary_key=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("lots.id"), nullable=False)
    uploaded_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    media_type: Mapped[str] = mapped_column(String(20), default="PHOTO")
    stage: Mapped[str] = mapped_column(String(30), default="PRELIMINARY")

    lot: Mapped["Lot"] = relationship(back_populates="media")


class PreliminaryScreening(Base, TimestampMixin):
    """Deterministic, local, mock preliminary AI screening result.

    This is explicitly NOT an authoritative grade. Physical assessment by an
    assayer (QualityAssessment) is the authoritative record.
    """

    __tablename__ = "preliminary_screenings"

    id: Mapped[int] = mapped_column(primary_key=True)
    lot_id: Mapped[int] = mapped_column(
        ForeignKey("lots.id"), unique=True, nullable=False
    )
    predicted_grade: Mapped[str] = mapped_column(String(20), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    defect_flags: Mapped[list] = mapped_column(JSON, default=list)
    model_version: Mapped[str] = mapped_column(
        String(50), default="annadata-local-screen-v1"
    )
    disclaimer: Mapped[str] = mapped_column(
        String(255),
        default="Preliminary screening only — physical verification required.",
    )

    lot: Mapped["Lot"] = relationship(back_populates="preliminary_screening")


class QualityAssessment(Base, TimestampMixin):
    """The authoritative, assayer-performed physical quality assessment.

    Once `is_finalized` is True, the record is immutable through normal
    update endpoints. Any correction must go through a documented,
    audit-logged correction flow rather than a silent update.
    """

    __tablename__ = "quality_assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    lot_id: Mapped[int] = mapped_column(
        ForeignKey("lots.id"), unique=True, nullable=False
    )
    assayer_id: Mapped[int] = mapped_column(
        ForeignKey("assayer_profiles.id"), nullable=False
    )
    sample_quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    final_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    final_grade: Mapped[Grade] = mapped_column(Enum(Grade), nullable=False)
    visible_defects: Mapped[list] = mapped_column(JSON, default=list)
    quality_notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_finalized: Mapped[bool] = mapped_column(Boolean, default=False)
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    lot: Mapped["Lot"] = relationship(back_populates="quality_assessment")
    assayer: Mapped["AssayerProfile"] = relationship()  # noqa: F821
