from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import NotFoundError
from app.middleware.deps import get_client_ip, require_roles
from app.models.enums import UserRole
from app.models.lot import Lot, LotMedia
from app.models.user import User
from app.services.audit import record_audit
from app.services.file_storage import get_storage, validate_and_read_upload

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


class LotMediaOut(BaseModel):
    id: int
    lot_id: int
    file_path: str
    media_type: str
    stage: str

    model_config = {"from_attributes": True}


@router.post("/lots/{lot_id}/media", response_model=LotMediaOut)
async def upload_lot_media(
    lot_id: int,
    request: Request,
    stage: str = Form(default="PRELIMINARY"),
    media_type: str = Form(default="PHOTO"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(
            UserRole.FPO_AGENT,
            UserRole.ASSAYER,
            UserRole.ADMIN,
            UserRole.BUYER,
            UserRole.FARMER,
        )
    ),
) -> LotMedia:
    lot = db.get(Lot, lot_id)
    if lot is None:
        raise NotFoundError("Lot not found")

    content = await validate_and_read_upload(file)
    file_path = get_storage().save(file, f"lots/{lot.id}", content)

    media = LotMedia(
        lot_id=lot.id,
        uploaded_by_user_id=user.id,
        file_path=file_path,
        media_type=media_type,
        stage=stage,
    )
    db.add(media)
    db.flush()

    record_audit(
        db,
        actor=user,
        action="LOT_MEDIA_UPLOADED",
        entity_type="Lot",
        entity_id=lot.id,
        new_value={"file_path": file_path, "stage": stage},
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(media)
    return media
