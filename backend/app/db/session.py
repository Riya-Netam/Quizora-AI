from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

_engine_kwargs: dict = {"pool_pre_ping": True}
if _is_sqlite:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Small pool: free managed Postgres tiers limit connections.
    _engine_kwargs.update(pool_size=5, max_overflow=5, pool_recycle=1800)

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)

if _is_sqlite:

    @event.listens_for(engine, "connect")
    def _enable_sqlite_fk(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
