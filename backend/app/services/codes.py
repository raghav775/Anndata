"""Human-readable, sequential code generators (LOT-2026-0001, PO-2026-0001)."""

import secrets
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session


def generate_lot_code(db: Session) -> str:
    from app.models.lot import Lot

    year = datetime.now(timezone.utc).year
    seq = db.query(func.count(Lot.id)).scalar() or 0
    return f"LOT-{year}-{seq + 1:04d}"


def generate_po_number(db: Session) -> str:
    from app.models.marketplace import PurchaseOrder

    year = datetime.now(timezone.utc).year
    seq = db.query(func.count(PurchaseOrder.id)).scalar() or 0
    return f"PO-{year}-{seq + 1:04d}"


def generate_dispute_code(db: Session) -> str:
    from app.models.dispute import Dispute

    year = datetime.now(timezone.utc).year
    seq = db.query(func.count(Dispute.id)).scalar() or 0
    return f"DSP-{year}-{seq + 1:04d}"


def generate_transaction_reference() -> str:
    return f"TXN-{secrets.token_hex(6).upper()}"
