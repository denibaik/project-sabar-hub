import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import settings


def _env_file_has_database_url() -> bool:
    """Apakah .env memuat DATABASE_URL? Dibaca langsung, bukan lewat settings —
    settings sudah terlanjur mengisi nilai bawaan sehingga tak bisa dibedakan."""
    berkas = Path(".env")
    if not berkas.exists():
        return False
    try:
        for baris in berkas.read_text(encoding="utf-8", errors="replace").splitlines():
            if baris.strip().startswith("DATABASE_URL=") and baris.split("=", 1)[1].strip():
                return True
    except OSError:
        pass
    return False

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

# SQLite menyimpan file di path relatif; foldernya harus ada sebelum engine dipakai.
# Tanpa ini, deploy bersih gagal dengan "unable to open database file".
if settings.database_url.startswith("sqlite:///"):
    _db_path = Path(settings.database_url.removeprefix("sqlite:///"))
    if _db_path.parent and str(_db_path.parent) not in (".", ""):
        _db_path.parent.mkdir(parents=True, exist_ok=True)

def describe_database() -> str:
    """Sebutkan database yang dipakai, tanpa membocorkan kata sandinya."""
    url = settings.database_url
    if url.startswith("sqlite:///"):
        return f"SQLite {Path(url.removeprefix('sqlite:///')).resolve()}"
    # postgresql+psycopg://user:sandi@host:port/nama -> host:port/nama
    ekor = url.rsplit("@", 1)[-1] if "@" in url else url
    skema = url.split("://", 1)[0]
    return f"{skema} {ekor}"


# `database_url` punya nilai bawaan SQLite. Itu memudahkan pengembangan lokal,
# tapi di server berarti DATABASE_URL yang hilang dari .env tidak menghentikan
# apa pun — aplikasi diam-diam membuat database kosong baru dan seluruh data
# produksi seolah lenyap. Pernah terjadi, dan tidak ada satu pun peringatan.
#
# Karena itu database yang dipakai selalu dicatat saat menyala, dan pemakaian
# nilai bawaan disebut terang-terangan.
print(f"[db] memakai {describe_database()}")
if "DATABASE_URL" not in os.environ and not _env_file_has_database_url():
    print("[db] ⚠ DATABASE_URL tidak ditemukan — memakai nilai bawaan. "
          "Di server ini hampir selalu salah: data lama ada di database lain.")

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
        "orders": {"source": "VARCHAR(30) DEFAULT 'manual'"},
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


def _alembic_config():
    from alembic.config import Config

    akar = Path(__file__).resolve().parents[3]      # raynor-hub-backend/
    cfg = Config(str(akar / "alembic.ini"))
    cfg.set_main_option("script_location", str(akar / "migrations"))
    cfg.set_main_option("sqlalchemy.url", settings.database_url.replace("%", "%%"))
    cfg.attributes["configure_logger"] = False      # jangan ganggu logger uvicorn
    return cfg


def run_migrations() -> None:
    """Bawa skema database ke versi terbaru.

    Ada dua keadaan yang harus dibedakan:

    1. Database baru (atau belum punya tabel) → jalankan seluruh migrasi.
    2. Database yang SUDAH berisi tabel dan data tapi belum pernah dikelola
       Alembic — yaitu produksi yang berjalan sebelum ini. Menjalankan migrasi
       di situ akan gagal karena `CREATE TABLE` menabrak tabel yang ada. Yang
       benar adalah menandainya (`stamp`) sebagai sudah berada di baseline,
       tanpa mengeksekusi apa pun.

    `ensure_columns()` dijalankan sekali sebelum stamp, supaya skema lama itu
    benar-benar setara dengan baseline sebelum diadopsi. Setelah itu ia tidak
    diperlukan lagi — Alembic yang mengurus perubahan berikutnya.
    """
    from alembic import command
    from sqlalchemy import inspect

    tabel = set(inspect(engine).get_table_names())
    cfg = _alembic_config()

    if tabel and "alembic_version" not in tabel:
        ensure_columns()
        command.stamp(cfg, "head")
        print("[db] skema lama diadopsi Alembic (stamp ke baseline)")
        return

    command.upgrade(cfg, "head")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
