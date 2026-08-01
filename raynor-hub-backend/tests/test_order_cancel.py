"""Membatalkan order yang belum selesai.

Dibutuhkan saat order duplikat terlanjur masuk dan belum boleh terkirim ke
pembeli — sebelum ini tidak ada cara membatalkannya dari dashboard sama sekali.
"""
from uuid import uuid4

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
ADMIN = {"X-Admin-Key": "test-admin-key"}
REG = {"X-Registration-Key": "test-registration-key"}


def _order(recipient="raynorqt"):
    r = client.post("/api/v1/orders", headers=ADMIN, json={
        "recipient": recipient,
        "items": [{"category": "Seeds", "item_key": "Ghost Pepper", "count": 1}],
    })
    return r.json()["id"]


def test_order_pending_bisa_dibatalkan():
    oid = _order()
    r = client.post(f"/api/v1/orders/{oid}/cancel", headers=ADMIN)
    assert r.status_code == 200
    assert r.json()["status"] == "failed"
    assert "dibatalkan manual" in r.json()["error"]


def test_order_yang_dibatalkan_tidak_bisa_diklaim_bot():
    """Inti gunanya: pembeli tidak menerima barang dari order duplikat."""
    oid = _order()
    client.post(f"/api/v1/orders/{oid}/cancel", headers=ADMIN)

    username = f"batalbot_{uuid4().hex[:8]}"
    tok = client.post("/api/v1/bots", headers=REG, json={
        "name": "Batal Bot", "username": username, "game": "Grow a Garden"}).json()["token"]
    stok = {"Seeds": {"Ghost Pepper": 99}}
    for _ in range(6):
        r = client.post("/api/v1/bots/claim", headers={"Authorization": f"Bearer {tok}"},
                        json={"inventory": stok, "names": {}})
        if r.status_code != 200:
            break
        assert r.json()["id"] != oid, "order yang dibatalkan masih terklaim"


def test_order_selesai_tidak_bisa_dibatalkan():
    """Barangnya sudah terkirim; menandainya batal hanya memalsukan riwayat."""
    oid = _order()
    username = f"batalbot_{uuid4().hex[:8]}"
    tok = client.post("/api/v1/bots", headers=REG, json={
        "name": "Batal Bot", "username": username, "game": "Grow a Garden"}).json()["token"]
    client.post("/api/v1/bots/result", headers={"Authorization": f"Bearer {tok}"},
                json={"order_id": oid, "status": "fulfilled", "sent_total": 1, "requested_total": 1})

    r = client.post(f"/api/v1/orders/{oid}/cancel", headers=ADMIN)
    assert r.status_code == 409


def test_order_tak_dikenal_menjawab_404():
    r = client.post(f"/api/v1/orders/{uuid4()}/cancel", headers=ADMIN)
    assert r.status_code == 404


def test_pembatalan_butuh_kunci_admin():
    oid = _order()
    assert client.post(f"/api/v1/orders/{oid}/cancel").status_code == 401
