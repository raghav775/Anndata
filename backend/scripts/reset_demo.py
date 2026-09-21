"""Wipe the local database and re-seed the AnnData demo from scratch.

Usage: python scripts/reset_demo.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import Base, engine  # noqa: E402

import app.models  # noqa: E402,F401  (ensures every model is registered on Base.metadata)
from scripts.seed import seed  # noqa: E402


def reset_demo() -> None:
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Recreating schema...")
    Base.metadata.create_all(bind=engine)
    seed()


if __name__ == "__main__":
    reset_demo()
