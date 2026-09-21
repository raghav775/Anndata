"""Background asyncio task that keeps the IoT storage demo "live".

Every tick, generates one simulated reading per storage facility, persists
it, and broadcasts it to any connected `/api/storage/ws/{facility_id}`
clients. Started from a FastAPI lifespan handler; safe to run with zero
facilities (it simply does nothing).
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.core.database import SessionLocal
from app.models.commodity import StorageFacility
from app.models.logistics import StorageEvent
from app.services.iot_simulator import generate_reading
from app.services.ws_manager import storage_manager

logger = logging.getLogger("annadata.iot")

TICK_SECONDS = 8


async def iot_simulation_loop() -> None:
    while True:
        try:
            await _tick()
        except Exception:  # pragma: no cover - defensive background loop
            logger.exception("IoT simulation tick failed")
        await asyncio.sleep(TICK_SECONDS)


async def _tick() -> None:
    db = SessionLocal()
    try:
        facilities = db.query(StorageFacility).all()
        for facility in facilities:
            occupancy_baseline = _occupancy_baseline(facility)
            reading = generate_reading(occupancy_baseline=occupancy_baseline)
            event = StorageEvent(
                facility_id=facility.id,
                temperature_celsius=reading.temperature_celsius,
                humidity_percent=reading.humidity_percent,
                occupancy_percent=reading.occupancy_percent,
                status=reading.status,
                recorded_at=datetime.now(timezone.utc),
            )
            db.add(event)
            db.flush()
            await storage_manager.broadcast(
                f"storage:{facility.id}",
                {
                    "id": event.id,
                    "facility_id": facility.id,
                    "temperature_celsius": event.temperature_celsius,
                    "humidity_percent": event.humidity_percent,
                    "occupancy_percent": event.occupancy_percent,
                    "status": event.status.value,
                    "recorded_at": event.recorded_at.isoformat(),
                },
            )
        db.commit()
    finally:
        db.close()


def _occupancy_baseline(facility: StorageFacility) -> float:
    if facility.total_capacity_kg <= 0:
        return 50.0
    used = facility.total_capacity_kg - facility.available_capacity_kg
    return max(0.0, min(100.0, (used / facility.total_capacity_kg) * 100))
