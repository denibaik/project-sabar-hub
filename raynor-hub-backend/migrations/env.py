"""Konfigurasi Alembic untuk Sabar Hub.

URL database TIDAK ditulis di `alembic.ini` — diambil dari setelan aplikasi yang
sama (`DATABASE_URL` di `.env`). Menuliskannya dua kali berarti suatu saat
keduanya berbeda, dan migrasi berjalan di database yang salah.
"""
from logging.config import fileConfig
import sys
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings  # noqa: E402
from app.infrastructure.database.session import Base  # noqa: E402

# Impor seluruh model supaya tabelnya terdaftar di Base.metadata sebelum
# autogenerate membandingkan. Model yang tidak terimpor akan dikira sudah
# dihapus, dan migrasi hasil autogenerate akan berisi DROP TABLE.
from app.infrastructure.database.models import (  # noqa: E402,F401
    bot, channel, order, webhook_event,
)

config = context.config
# '%' punya arti khusus di ConfigParser; sandi database bisa memuatnya.
config.set_main_option("sqlalchemy.url", settings.database_url.replace("%", "%%"))

# Saat dipanggil dari dalam aplikasi, jangan sentuh konfigurasi logging global —
# itu akan mematikan logger uvicorn dan pytest.
if config.config_file_name is not None and config.attributes.get("configure_logger", True):
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # SQLite tak bisa ALTER kolom; batch mode menulis ulang tabelnya.
            # Tak berpengaruh di PostgreSQL.
            render_as_batch=connection.dialect.name == "sqlite",
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
