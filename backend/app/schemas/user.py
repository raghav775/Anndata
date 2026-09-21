from pydantic import BaseModel, EmailStr, Field

from app.models.enums import BuyerType, VerificationStatus
from app.schemas.common import ORMModel


class FarmerCreate(BaseModel):
    full_name: str
    phone: str
    email: EmailStr | None = None
    village: str
    taluka: str
    district: str
    state: str
    land_area_acres: float | None = Field(default=None, ge=0)
    fpo_id: int
    preferred_language: str = "en"


class FarmerOut(ORMModel):
    id: int
    village: str
    taluka: str
    district: str
    state: str
    land_area_acres: float | None
    fpo_id: int | None
    user_id: int
    full_name: str | None = None
    phone: str | None = None


class FPOOrganizationOut(ORMModel):
    id: int
    name: str
    registration_number: str | None
    village: str
    district: str
    state: str
    is_synthetic_demo: bool


class BuyerOut(ORMModel):
    id: int
    organization_name: str
    buyer_type: BuyerType
    gstin: str | None
    address: str
    verification_status: VerificationStatus
    user_id: int


class AssayerOut(ORMModel):
    id: int
    certification_id: str | None
    affiliated_fpo_id: int | None
    user_id: int


class TransporterOut(ORMModel):
    id: int
    company_name: str
    contact_phone: str
    user_id: int
