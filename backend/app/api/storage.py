from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import NotFoundError, ValidationAppError
from app.middleware.deps import get_client_ip, get_current_user, require_roles
from app.models.commodity import StorageFacility
from app.models.enums import UserRole
from app.models.lot import Lot
from app.models.logistics import StorageBooking, StorageEvent
from app.models.user import User
from app.schemas.logistics import (
    StorageBookingCreate,
    StorageBookingOut,
    StorageEventOut,
    StorageFacilityOut,
)
from app.services.audit import record_audit
from app.services.iot_simulator import generate_reading
from app.services.ws_manager import storage_manager

router = APIRouter(prefix="/api/storage", tags=["storage"])


@router.get("", response_model=list[StorageFacilityOut])
def list_facilities(
    db: Session = Depends(get_db), _user: User = Depends(get_current_user)
) -> list[StorageFacility]:
    return db.query(StorageFacility).order_by(StorageFacility.id).all()


@router.get("/{facility_id}", response_model=StorageFacilityOut)
def get_facility(
    facility_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> StorageFacility:
    facility = db.get(StorageFacility, facility_id)
    if facility is None:
        raise NotFoundError("Storage facility not found")
    return facility


@router.post("/bookings", response_model=StorageBookingOut)
def book_storage(
    payload: StorageBookingCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(UserRole.FPO_AGENT, UserRole.BUYER, UserRole.ADMIN)
    ),
) -> StorageBooking:
    lot = db.get(Lot, payload.lot_id)
    if lot is None:
        raise NotFoundError("Lot not found")
    facility = db.get(StorageFacility, payload.facility_id)
    if facility is None:
        raise NotFoundError("Storage facility not found")
    if payload.booked_quantity_kg > facility.available_capacity_kg:
        raise ValidationAppError(
            "Requested quantity exceeds available storage capacity"
        )

    booking = StorageBooking(
        lot_id=payload.lot_id,
        facility_id=payload.facility_id,
        booked_quantity_kg=payload.booked_quantity_kg,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    facility.available_capacity_kg -= payload.booked_quantity_kg
    db.add(booking)

    record_audit(
        db,
        actor=user,
        action="STORAGE_BOOKED",
        entity_type="StorageBooking",
        entity_id=lot.id,
        new_value={
            "facility_id": facility.id,
            "booked_quantity_kg": payload.booked_quantity_kg,
        },
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/bookings/list", response_model=list[StorageBookingOut])
def list_bookings(
    lot_id: int | None = None,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[StorageBooking]:
    query = db.query(StorageBooking)
    if lot_id:
        query = query.filter(StorageBooking.lot_id == lot_id)
    return query.order_by(StorageBooking.id.desc()).all()


@router.get("/{facility_id}/events", response_model=list[StorageEventOut])
def list_events(
    facility_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[StorageEvent]:
    if db.get(StorageFacility, facility_id) is None:
        raise NotFoundError("Storage facility not found")
    return (
        db.query(StorageEvent)
        .filter(StorageEvent.facility_id == facility_id)
        .order_by(StorageEvent.recorded_at.desc())
        .limit(limit)
        .all()
    )


@router.post("/{facility_id}/events/simulate", response_model=StorageEventOut)
def simulate_event(
    facility_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> StorageEvent:
    """Generates one simulated sensor reading on demand (used by the demo UI
    in addition to the periodic background stream)."""
    facility = db.get(StorageFacility, facility_id)
    if facility is None:
        raise NotFoundError("Storage facility not found")
    reading = generate_reading(occupancy_baseline=_occupancy_baseline(facility))
    event = StorageEvent(
        facility_id=facility.id,
        temperature_celsius=reading.temperature_celsius,
        humidity_percent=reading.humidity_percent,
        occupancy_percent=reading.occupancy_percent,
        status=reading.status,
        recorded_at=datetime.now(timezone.utc),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def _occupancy_baseline(facility: StorageFacility) -> float:
    if facility.total_capacity_kg <= 0:
        return 50.0
    used = facility.total_capacity_kg - facility.available_capacity_kg
    return max(0.0, min(100.0, (used / facility.total_capacity_kg) * 100))


@router.websocket("/ws/{facility_id}")
async def storage_ws(websocket: WebSocket, facility_id: int) -> None:
    channel = f"storage:{facility_id}"
    await storage_manager.connect(channel, websocket)
    try:
        while True:
            # This channel is push-only from the server; we still need to
            # await something so a client disconnect is detected promptly.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await storage_manager.disconnect(channel, websocket)
