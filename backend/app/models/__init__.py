"""Import every model so Base.metadata / Alembic autogenerate can see them."""

from app.core.database import Base
from app.models.commodity import Commodity, StorageFacility
from app.models.dispute import Dispute, DisputeEvidence
from app.models.finance import Payment, Settlement, SettlementItem
from app.models.logistics import Shipment, StorageBooking, StorageEvent
from app.models.lot import (
    Lot,
    LotContributor,
    LotMedia,
    PreliminaryScreening,
    QualityAssessment,
)
from app.models.marketplace import Offer, PurchaseOrder
from app.models.system import AuditLog, ConsentRecord, Notification
from app.models.user import (
    AssayerProfile,
    BuyerProfile,
    FarmerProfile,
    FPOAgentProfile,
    FPOOrganization,
    TransporterProfile,
    User,
)

__all__ = [
    "Base",
    "User",
    "FarmerProfile",
    "FPOOrganization",
    "FPOAgentProfile",
    "BuyerProfile",
    "AssayerProfile",
    "TransporterProfile",
    "Commodity",
    "StorageFacility",
    "Lot",
    "LotContributor",
    "LotMedia",
    "PreliminaryScreening",
    "QualityAssessment",
    "Offer",
    "PurchaseOrder",
    "Shipment",
    "StorageBooking",
    "StorageEvent",
    "Payment",
    "Settlement",
    "SettlementItem",
    "Dispute",
    "DisputeEvidence",
    "AuditLog",
    "Notification",
    "ConsentRecord",
]
