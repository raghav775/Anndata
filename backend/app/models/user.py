from __future__ import annotations


from sqlalchemy import Boolean, Enum, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import BuyerType, UserRole, VerificationStatus
from app.models.mixins import TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(5), default="en")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_synthetic_demo: Mapped[bool] = mapped_column(Boolean, default=False)

    farmer_profile: Mapped["FarmerProfile | None"] = relationship(
        back_populates="user", uselist=False
    )
    fpo_agent_profile: Mapped["FPOAgentProfile | None"] = relationship(
        back_populates="user", uselist=False
    )
    buyer_profile: Mapped["BuyerProfile | None"] = relationship(
        back_populates="user", uselist=False
    )
    assayer_profile: Mapped["AssayerProfile | None"] = relationship(
        back_populates="user", uselist=False
    )
    transporter_profile: Mapped["TransporterProfile | None"] = relationship(
        back_populates="user", uselist=False
    )


class FPOOrganization(Base, TimestampMixin):
    """A Farmer Producer Organization / collection centre operator.

    SYNTHETIC DEMO DATA in the seed script — not a real registered entity.
    """

    __tablename__ = "fpo_organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    registration_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    village: Mapped[str] = mapped_column(String(120), nullable=False)
    district: Mapped[str] = mapped_column(String(120), nullable=False)
    state: Mapped[str] = mapped_column(String(120), nullable=False)
    is_synthetic_demo: Mapped[bool] = mapped_column(Boolean, default=False)

    farmers: Mapped[list["FarmerProfile"]] = relationship(back_populates="fpo")


class FarmerProfile(Base, TimestampMixin):
    __tablename__ = "farmer_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, nullable=False
    )
    fpo_id: Mapped[int | None] = mapped_column(
        ForeignKey("fpo_organizations.id"), nullable=True
    )
    village: Mapped[str] = mapped_column(String(120), nullable=False)
    taluka: Mapped[str] = mapped_column(String(120), nullable=False)
    district: Mapped[str] = mapped_column(String(120), nullable=False)
    state: Mapped[str] = mapped_column(String(120), nullable=False)
    land_area_acres: Mapped[float | None] = mapped_column(Float, nullable=True)
    bank_account_ref: Mapped[str | None] = mapped_column(String(64), nullable=True)

    user: Mapped["User"] = relationship(back_populates="farmer_profile")
    fpo: Mapped["FPOOrganization | None"] = relationship(back_populates="farmers")


class FPOAgentProfile(Base, TimestampMixin):
    __tablename__ = "fpo_agent_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, nullable=False
    )
    fpo_id: Mapped[int] = mapped_column(
        ForeignKey("fpo_organizations.id"), nullable=False
    )
    designation: Mapped[str] = mapped_column(
        String(120), default="Collection Centre Agent"
    )

    user: Mapped["User"] = relationship(back_populates="fpo_agent_profile")
    fpo: Mapped["FPOOrganization"] = relationship()


class BuyerProfile(Base, TimestampMixin):
    __tablename__ = "buyer_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, nullable=False
    )
    organization_name: Mapped[str] = mapped_column(String(255), nullable=False)
    buyer_type: Mapped[BuyerType] = mapped_column(Enum(BuyerType), nullable=False)
    gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus), default=VerificationStatus.UNVERIFIED
    )

    user: Mapped["User"] = relationship(back_populates="buyer_profile")


class AssayerProfile(Base, TimestampMixin):
    __tablename__ = "assayer_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, nullable=False
    )
    certification_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    affiliated_fpo_id: Mapped[int | None] = mapped_column(
        ForeignKey("fpo_organizations.id"), nullable=True
    )

    user: Mapped["User"] = relationship(back_populates="assayer_profile")


class TransporterProfile(Base, TimestampMixin):
    __tablename__ = "transporter_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, nullable=False
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(20), nullable=False)

    user: Mapped["User"] = relationship(back_populates="transporter_profile")
