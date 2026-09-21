"""Application configuration.

All settings have safe local defaults so the application runs with zero
required secrets or paid services. See ../../.env.example for the full list
of overridable variables.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"), extra="ignore"
    )

    annadata_env: str = "development"

    database_url: str = f"sqlite:///{(BACKEND_DIR / 'annadata.db').as_posix()}"

    jwt_secret_key: str = "annadata-dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    storage_backend: str = "local"
    local_storage_path: str = str(BACKEND_DIR / "uploads")
    max_upload_size_mb: int = 5

    ai_screening_provider: str = "local"

    payments_provider: str = "mock"

    rate_limit_per_minute: int = 120

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()
