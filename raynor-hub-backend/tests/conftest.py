"""Konfigurasi bersama untuk test.

Menghapus DB test sebelum sesi dimulai. Tanpa ini, data dari run sebelumnya
tertinggal dan menyebabkan kegagalan palsu — mis. bot mengklaim order sisa
run lama, sehingga assertion tentang order yang baru dibuat meleset.
"""
import os
import pathlib

TEST_DB = pathlib.Path("data/sqlite/test_sabar_hub.db")

# Harus di-set sebelum app.main diimpor oleh modul test mana pun.
os.environ.setdefault("DATABASE_URL", f"sqlite:///./{TEST_DB.as_posix()}")
os.environ.setdefault("BOT_REGISTRATION_KEY", "test-registration-key")
os.environ.setdefault("ADMIN_API_KEY", "test-admin-key")

TEST_DB.parent.mkdir(parents=True, exist_ok=True)
if TEST_DB.exists():
    TEST_DB.unlink()
