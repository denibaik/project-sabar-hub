"""Webhook U7Buy: tanda tangan, dedup, dan kontrak balasan."""
import hashlib
import hmac
import json
import os


from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.infrastructure.security.u7buy_signature import verify, candidate_signatures

client = TestClient(app)
ADMIN = {"X-Admin-Key": "test-admin-key"}

APP_ID = "test-app-id"
SECRET = "test-app-secret"


def sign(raw: str) -> str:
    """Tanda tangan sesuai langkah dokumentasi: HMAC-SHA256("appId,body") → hex."""
    return hmac.new(SECRET.encode(), f"{APP_ID},{raw}".encode(), hashlib.sha256).hexdigest()


def post(raw: str, signature: str | None):
    headers = {"Content-Type": "application/json"}
    if signature is not None:
        headers[settings.u7buy_signature_header] = signature
    return client.post("/api/v1/webhooks/u7buy", content=raw, headers=headers)


def test_valid_signature_is_accepted_and_returns_expected_body():
    raw = json.dumps({"event": "new_order_received", "timestamp": "1757670260992",
                      "data": {"orderId": 1966432766178033667}})
    r = post(raw, sign(raw))
    assert r.status_code == 200, r.text
    # U7Buy mensyaratkan bentuk balasan ini persis
    assert r.json() == {"status": "OK"}


def test_bad_signature_is_rejected():
    raw = json.dumps({"event": "new_order_received", "data": {"orderId": 1}})
    assert post(raw, "deadbeef").status_code == 401
    assert post(raw, None).status_code == 401


def test_repeat_delivery_is_deduped():
    """U7Buy mengulang sampai 5x — pengulangan tidak boleh tercatat dua kali."""
    raw = json.dumps({"event": "new_order_received", "timestamp": "1",
                      "data": {"orderId": 424242424242}})
    sig = sign(raw)
    assert post(raw, sig).status_code == 200
    assert post(raw, sig).status_code == 200  # kiriman ulang tetap dibalas OK

    events = client.get("/api/v1/webhooks/events", headers=ADMIN).json()["items"]
    matching = [e for e in events if e["dedupe_key"] == "new_order_received:424242424242"]
    assert len(matching) == 1, "event berulang harus tersimpan sekali saja"


def test_signature_helper_accepts_documented_construction():
    raw = '{"event":"x","data":{}}'
    assert verify(APP_ID, SECRET, raw, sign(raw)) is True
    assert verify(APP_ID, SECRET, raw, "salah") is False
    assert verify(APP_ID, SECRET, raw, None) is False
    # kandidat dipaparkan untuk mencocokkan format saat webhook asli masuk
    assert "raw" in candidate_signatures(APP_ID, SECRET, raw)
