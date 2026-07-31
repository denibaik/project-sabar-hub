from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

# SQLite menyimpan file di path relatif; foldernya harus ada sebelum engine dipakai.
# Tanpa ini, deploy bersih gagal dengan "unable to open database file".
if settings.database_url.startswith("sqlite:///"):
    _db_path = Path(settings.database_url.removeprefix("sqlite:///"))
    if _db_path.parent and str(_db_path.parent) not in (".", ""):
        _db_path.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass

def ensure_columns() -> None:
    """Migrasi ringan: tambah kolom baru pada tabel yang sudah ada.

    `create_all()` hanya membuat tabel baru, tidak mengubah tabel lama. Sampai
    Alembic dipasang, kolom tambahan didaftarkan di sini — idempoten, aman
    dijalankan tiap start.
    """
    from sqlalchemy import inspect, text

    wanted = {
        "bots": {"token_prefix": "VARCHAR(32)"},
    }
    insp = inspect(engine)
    with engine.begin() as conn:
        for table, columns in wanted.items():
            if table not in insp.get_table_names():
                continue
            existing = {c["name"] for c in insp.get_columns(table)}
            for col, ddl in columns.items():
                if col not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
