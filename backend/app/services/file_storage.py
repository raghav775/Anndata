"""File storage abstraction.

`LocalFileStorage` is the zero-cost default (saves under LOCAL_STORAGE_PATH).
`get_storage()` is the seam a future S3-compatible backend would plug into
by branching on settings.storage_backend — no caller code would need to
change, since callers only depend on the `FileStorage` interface.
"""

import mimetypes
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from fastapi import UploadFile

from app.core.config import get_settings
from app.core.errors import ValidationAppError

settings = get_settings()

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}


class FileStorage(ABC):
    @abstractmethod
    def save(self, upload: UploadFile, subdir: str, content: bytes) -> str:
        """Persist `content` and return a relative path/key clients can be
        served from (e.g. via a static file mount)."""


class LocalFileStorage(FileStorage):
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def save(self, upload: UploadFile, subdir: str, content: bytes) -> str:
        target_dir = self.base_path / subdir
        target_dir.mkdir(parents=True, exist_ok=True)
        ext = Path(upload.filename or "").suffix.lower()
        filename = f"{uuid.uuid4().hex}{ext}"
        target_path = target_dir / filename
        target_path.write_bytes(content)
        return f"{subdir}/{filename}"


def get_storage() -> FileStorage:
    # Only "local" is implemented in the MVP by design (see .env.example) —
    # the abstraction exists so an S3-compatible backend can be added later
    # without touching callers.
    return LocalFileStorage(settings.local_storage_path)


async def validate_and_read_upload(upload: UploadFile) -> bytes:
    ext = Path(upload.filename or "").suffix.lower()
    content_type = upload.content_type or mimetypes.guess_type(upload.filename or "")[0]

    if content_type not in ALLOWED_MIME_TYPES or ext not in ALLOWED_EXTENSIONS:
        raise ValidationAppError(
            f"Unsupported file type '{content_type or ext}'. "
            f"Allowed types: {', '.join(sorted(ALLOWED_MIME_TYPES))}."
        )

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    content = await upload.read()
    if len(content) > max_bytes:
        raise ValidationAppError(
            f"File exceeds the maximum upload size of {settings.max_upload_size_mb}MB."
        )
    return content
