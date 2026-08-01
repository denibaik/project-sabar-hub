"""Alembic: database baru dibangun, database lama diadopsi tanpa kehilangan data.

Yang paling berisiko bukan database kosong, melainkan yang SUDAH berjalan di
produksi: berisi tabel dan order sungguhan, tapi belum pernah dikenal Alembic.
Menjalankan migrasi mentah di situ gagal karena CREATE TABLE menabrak tabel yang
ada — dan "perbaikan" yang salah bisa berarti menghapus data pelanggan.
"""
import pathlib
import subprocess
import sys
import textwrap
from uuid import uuid4

AKAR = pathlib.Path(__file__).resolve().parent.parent
PYTHON = sys.executable


def _jalankan(kode: str, db_url: str) -> subprocess.CompletedProcess:
    """Jalankan potongan kode di proses terpisah dengan DATABASE_URL sendiri.

    Harus proses terpisah: engine dan setelan dibuat sekali saat modul diimpor,
    jadi mengubah DATABASE_URL di proses yang sama tidak berpengaruh.
    """
    import os
    env = {**os.environ, "DATABASE_URL": db_url}
    return subprocess.run([PYTHON, "-c", textwrap.dedent(kode)],
                          cwd=AKAR, env=env, capture_output=True, text=True, timeout=180)


def _url(tmp_path, nama):
    return f"sqlite:///{(tmp_path / nama).as_posix()}"


def test_database_baru_dibangun_dari_migrasi(tmp_path):
    hasil = _jalankan("""
        from app.infrastructure.database.session import run_migrations, engine
        from sqlalchemy import inspect
        run_migrations()
        tabel = sorted(inspect(engine).get_table_names())
        print("TABEL:", ",".join(tabel))
    """, _url(tmp_path, "baru.db"))

    assert hasil.returncode == 0, hasil.stderr
    baris = [l for l in hasil.stdout.splitlines() if l.startswith("TABEL:")][0]
    tabel = [t.strip() for t in baris.removeprefix("TABEL:").split(",")]
    for wajib in ("alembic_version", "bots", "orders", "channels", "webhook_events"):
        assert wajib in tabel, f"{wajib} tidak dibuat"


def test_database_lama_diadopsi_dan_datanya_utuh(tmp_path):
    """Ini keadaan produksi saat Alembic dipasang: tabel ada, data ada, versi belum."""
    db = _url(tmp_path, "lama.db")
    ref = uuid4().hex

    # (1) bangun database "lama" seperti sebelum Alembic: create_all, tanpa versi
    siap = _jalankan(f"""
        from app.infrastructure.database.session import Base, engine, SessionLocal
        from app.infrastructure.database.models.order import OrderModel
        from uuid import uuid4
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        db.add(OrderModel(id=uuid4(), recipient="pembeli-lama",
                          items=[{{"category": "Seeds", "item_key": "Ghost Pepper", "count": 1}}],
                          note="{ref}", source="manual", status="done", requested_total=1))
        db.commit(); db.close()
        print("SIAP")
    """, db)
    assert siap.returncode == 0, siap.stderr
    assert "SIAP" in siap.stdout

    # (2) jalankan run_migrations di database itu
    hasil = _jalankan(f"""
        from app.infrastructure.database.session import run_migrations, engine, SessionLocal
        from app.infrastructure.database.models.order import OrderModel
        from sqlalchemy import inspect, select
        run_migrations()
        assert "alembic_version" in inspect(engine).get_table_names()
        db = SessionLocal()
        n = db.scalar(select(OrderModel).where(OrderModel.note == "{ref}"))
        print("ORDER_UTUH:", n is not None and n.recipient == "pembeli-lama")
        db.close()
    """, db)

    assert hasil.returncode == 0, hasil.stderr
    assert "ORDER_UTUH: True" in hasil.stdout, "data order lama hilang saat adopsi"
    assert "diadopsi Alembic" in hasil.stdout


def test_dijalankan_dua_kali_tidak_bermasalah(tmp_path):
    """Backend memanggilnya tiap kali menyala — harus aman diulang."""
    db = _url(tmp_path, "ulang.db")
    for _ in range(3):
        hasil = _jalankan("""
            from app.infrastructure.database.session import run_migrations
            run_migrations()
            print("OK")
        """, db)
        assert hasil.returncode == 0, hasil.stderr
        assert "OK" in hasil.stdout


def test_baseline_sesuai_dengan_model(tmp_path):
    """Autogenerate pada database yang sudah termigrasi harus menghasilkan
    perubahan KOSONG. Kalau tidak, migrasi dan model sudah berbeda."""
    hasil = _jalankan("""
        from alembic import command
        from alembic.autogenerate import compare_metadata
        from alembic.migration import MigrationContext
        from app.infrastructure.database.session import run_migrations, engine, Base
        run_migrations()
        with engine.connect() as conn:
            ctx = MigrationContext.configure(conn)
            beda = compare_metadata(ctx, Base.metadata)
        print("BEDA:", len(beda), beda if beda else "")
    """, _url(tmp_path, "banding.db"))

    assert hasil.returncode == 0, hasil.stderr
    baris = [l for l in hasil.stdout.splitlines() if l.startswith("BEDA:")][0]
    assert baris.startswith("BEDA: 0"), f"model dan migrasi tidak sinkron -> {baris}"
