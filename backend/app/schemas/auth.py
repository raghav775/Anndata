from pydantic import BaseModel, EmailStr

from app.models.enums import UserRole
from app.schemas.common import ORMModel


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(ORMModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    phone: str | None
    preferred_language: str
    is_active: bool
