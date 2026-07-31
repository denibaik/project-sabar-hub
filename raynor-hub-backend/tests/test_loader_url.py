"""Loader menyuntikkan alamat backend, agar file di repo tak perlu diedit di server."""
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def _base_url_line(text: str) -> str:
    for line in text.splitlines():
        if "BASE_URL" in line and "=" in line:
            return line.strip()
    return ""


def test_injects_configured_public_url():
    old = settings.public_api_url
    settings.public_api_url = "https://api.contoh.com/"
    try:
        r = client.get("/files/loader.lua")
        assert r.status_code == 200
        line = _base_url_line(r.text)
        assert '"https://api.contoh.com"' in line, line
        assert line.count('"') == 2, f"tanda kutip harus tetap rapi: {line}"
    finally:
        settings.public_api_url = old


def test_leaves_script_untouched_when_unset():
    old = settings.public_api_url
    settings.public_api_url = ""
    try:
        served = client.get("/files/loader.lua").text
        from app.main import _SCRIPT_PATH
        assert served == _SCRIPT_PATH.read_text(encoding="utf-8")
    finally:
        settings.public_api_url = old


def test_only_first_base_url_is_replaced_and_script_stays_valid():
    old = settings.public_api_url
    settings.public_api_url = "https://api.contoh.com"
    try:
        text = client.get("/files/loader.lua").text
        # hanya satu penetapan BASE_URL yang diganti; sisa script utuh
        assert text.count('BASE_URL         = "https://api.contoh.com"') == 1
        assert "CONFIG.BASE_URL .. path" in text, "pemakaian BASE_URL lain jangan ikut diubah"
        assert "getgenv().BOT_TOKEN" in text
    finally:
        settings.public_api_url = old
