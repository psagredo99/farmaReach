from contextlib import contextmanager

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from src.core.config import DB_URL
from src.core.models import Base

engine = create_engine(DB_URL, echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_schema_compat()


def _ensure_schema_compat() -> None:
    inspector = inspect(engine)
    if "leads" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("leads")}
    with engine.begin() as conn:
        if "owner_id" not in columns:
            conn.execute(text("ALTER TABLE leads ADD COLUMN owner_id VARCHAR(64) NOT NULL DEFAULT ''"))
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_leads_owner_id ON leads (owner_id)"))
        except Exception:
            # Index creation can vary across DB engines/versions.
            pass


@contextmanager
def get_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
