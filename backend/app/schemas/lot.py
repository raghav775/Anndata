from pydantic import BaseModel, Field, field_validator

from app.models.enums import Grade, LotStatus
from app.schemas.common import ORMModel


class LotContributorIn(BaseModel):
    farmer_id: int
    quantity_kg: float = Field(gt=0)


class LotCreate(BaseModel):
    commodity_id: int
    variety: str | None = None
    fpo_id: int
    village_origin: str
    collection_point: str
    expected_harvest_date: str | None = None
    contributors: list[LotContributorIn]

    @field_validator("contributors")
    @classmethod
    def at_least_one_contributor(
        cls, v: list[LotContributorIn]
    ) -> list[LotContributorIn]:
        if not v:
            raise ValueError("a lot must have at least one farmer contributor")
        farmer_ids = [c.farmer_id for c in v]
        if len(farmer_ids) != len(set(farmer_ids)):
            raise ValueError("duplicate farmer contributor in the same lot")
        return v


class LotContributorOut(ORMModel):
    id: int
    farmer_id: int
    quantity_kg: float
    farmer_name: str | None = None


class LotOut(ORMModel):
    id: int
    lot_code: str
    commodity_id: int
    variety: str | None
    fpo_id: int
    village_origin: str
    collection_point: str
    expected_harvest_date: str | None
    total_quantity_kg: float
    preliminary_grade: str | None
    final_grade: Grade | None
    status: LotStatus
    is_synthetic_demo: bool
    contributors: list[LotContributorOut] = []


class ScreeningOut(ORMModel):
    id: int
    lot_id: int
    predicted_grade: str
    confidence_score: float
    defect_flags: list
    model_version: str
    disclaimer: str


class QualityAssessmentIn(BaseModel):
    sample_quantity_kg: float = Field(gt=0)
    final_weight_kg: float = Field(gt=0)
    final_grade: Grade
    visible_defects: list[str] = []
    quality_notes: str | None = None


class QualityAssessmentOut(ORMModel):
    id: int
    lot_id: int
    assayer_id: int
    sample_quantity_kg: float
    final_weight_kg: float
    final_grade: Grade
    visible_defects: list
    quality_notes: str | None
    is_finalized: bool
