import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import (
    analytics,
    assayers,
    audit_logs,
    auth,
    buyers,
    disputes,
    farmers,
    fpos,
    lots,
    notifications,
    offers,
    payments,
    purchase_orders,
    settlements,
    shipments,
    storage,
    transporters,
    uploads,
    users,
)
from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.middleware.rate_limit import RateLimitMiddleware
from app.services.background import iot_simulation_loop

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.local_storage_path, exist_ok=True)
    task = asyncio.create_task(iot_simulation_loop())
    try:
        yield
    finally:
        task.cancel()


app = FastAPI(
    title="AnnData API",
    description=(
        "FPO-assisted transparent agricultural market and settlement platform. "
        "Pilot commodity: onion. Pilot region: Niphad-Lasalgaon, Nashik, Maharashtra."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

register_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)

os.makedirs(settings.local_storage_path, exist_ok=True)
app.mount(
    "/uploads", StaticFiles(directory=settings.local_storage_path), name="uploads"
)


@app.get("/api/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "environment": settings.annadata_env}


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(farmers.router)
app.include_router(fpos.router)
app.include_router(buyers.router)
app.include_router(assayers.router)
app.include_router(transporters.router)
app.include_router(lots.router)
app.include_router(offers.router)
app.include_router(purchase_orders.router)
app.include_router(shipments.router)
app.include_router(storage.router)
app.include_router(payments.router)
app.include_router(settlements.router)
app.include_router(disputes.router)
app.include_router(audit_logs.router)
app.include_router(notifications.router)
app.include_router(analytics.router)
app.include_router(uploads.router)
