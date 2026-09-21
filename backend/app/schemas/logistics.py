from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import SensorStatus, ShipmentStatus, StorageBookingStatus
from app.schemas.common import ORMModel


class ShipmentCreate(BaseModel):
    lot_id: int
    purchase_order_id: int
    transporter_id: int
    vehicle_number: str
    vehicle_type: str
    capacity_kg: float = Field(gt=0)
    driver_contact: str
    pickup_point: str
    delivery_point: str
    estimated_cost: float = Field(default=0, ge=0)


class ShipmentOut(ORMModel):
    id: int
    lot_id: int
    purchase_order_id: int
    transporter_id: int
    vehicle_number: str
    vehicle_type: str
    capacity_kg: float
    driver_contact: str
    pickup_point: str
    delivery_point: str
    estimated_cost: float
    pickup_scheduled_at: datetime | None
    picked_up_at: datetime | None
    delivered_at: datetime | None
    status: ShipmentStatus


class ShipmentStatusUpdate(BaseModel):
    status: ShipmentStatus


class StorageFacilityOut(ORMModel):
    id: int
    name: str
    operator_name: str
    village: str
    district: str
    state: str
    latitude: float | None
    longitude: float | None
    total_capacity_kg: float
    available_capacity_kg: float
    ventilation_type: str
    tariff_per_kg_per_day: float
    commodity_compatibility: list
    insurance_provider: str | None
    liability_notes: str | None
    last_inspection_date: str | None
    incident_status: str
    is_synthetic_demo: bool


class StorageBookingCreate(BaseModel):
    lot_id: int
    facility_id: int
    booked_quantity_kg: float = Field(gt=0)
    start_date: str
    end_date: str | None = None


class StorageBookingOut(ORMModel):
    id: int
    lot_id: int
    facility_id: int
    booked_quantity_kg: float
    start_date: str
    end_date: str | None
    status: StorageBookingStatus


class StorageEventOut(BaseModel):
    id: int
    facility_id: int
    booking_id: int | None
    temperature_celsius: float
    humidity_percent: float
    occupancy_percent: float
    status: SensorStatus
    recorded_at: datetime

    model_config = {"from_attributes": True}
