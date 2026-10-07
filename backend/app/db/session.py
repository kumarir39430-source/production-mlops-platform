"""Database engine and session management."""

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

_settings = get_settings()

_db_url = _settings.database_url.get_secret_value()
_connect_args: dict[str, object] = {}
if _db_url.startswith("postgresql"):
    _connect_args["connect_timeout"] = 5
elif _db_url.startswith("sqlite"):
    _connect_args["check_same_thread"] = False

# create_engine is lazy: it does not connect until the first query.
engine = create_engine(
    _db_url,
    pool_pre_ping=True,  # transparently discard dead connections
    connect_args=_connect_args,
)


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request, always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
