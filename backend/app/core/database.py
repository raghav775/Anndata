"""Database engine/session setup.

Uses SQLite by default (zero-cost, zero-config). The application only uses
SQLAlchemy Core/ORM features that are portable to PostgreSQL, so switching
DATABASE_URL to a postgresql+psycopg2:// DSN later does not require model or
query rewrites — only running the Alembic migrations against the new target.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.is_sqlite else {}
engine = create_engine(settings.database_url, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
