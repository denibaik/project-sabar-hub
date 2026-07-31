import os
from uuid import uuid4

os.environ["DATABASE_URL"] = "sqlite:///./data/sqlite/test_sabar_hub.db"
# Kunci khusus test — agar tidak bergantung pada .env milik developer
os.environ["BOT_REGISTRATION_KEY"] = "test-registration-key"
os.environ["ADMIN_API_KEY"] = "test-admin-key"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
REG = {"X-Registration-Key": "test-registration-key"}
ADMIN = {"X-Admin-Key": "test-admin-key"}


def _register(inventory=None):
    username = "OrderBot_" + uuid4().hex[:8]
    r = client.post("/api/v1/bots", headers=REG, json={"name": "Order Bot", "username": username, "game": "Grow a Garden"})
    assert r.status_code == 201, r.text
    token = r.json()["token"]
    hb = client.post("/api/v1/bots/heartbeat", headers={"Authorization": f"Bearer {token}"},
                     json={"server": "SG", "ping_ms": 20, "inventory": inventory or {}})
    assert hb.status_code == 200, hb.text
    return username, token


def test_full_flow_stocked_bot_fulfills():
    _, token = _register(inventory={"Sprinklers": {"Super Sprinkler": 5}})
    # buat order
    r = client.post("/api/v1/orders", headers=ADMIN, json={
        "recipient": "buyerX",
        "items": [{"category": "Sprinklers", "item_key": "Super Sprinkler", "count": 2}],
    })
    assert r.status_code == 201, r.text
    order_id = r.json()["id"]
    assert r.json()["requested_total"] == 2
    # bot claim
    c = client.post("/api/v1/bots/claim", headers={"Authorization": f"Bearer {token}"},
                    json={"inventory": {"Sprinklers": {"Super Sprinkler": 5}}})
    assert c.status_code == 200, c.text
    assert c.json()["id"] == order_id
    assert c.json()["status"] == "processing"
    # bot lapor sukses
    res = client.post("/api/v1/bots/result", headers={"Authorization": f"Bearer {token}"},
                      json={"order_id": order_id, "status": "fulfilled", "sent_total": 2, "requested_total": 2})
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "done"
    assert res.json()["sent_total"] == 2


def test_routing_empty_bot_gets_204():
    # order butuh item langka
    r = client.post("/api/v1/orders", headers=ADMIN, json={
        "recipient": "buyerY",
        "items": [{"category": "WateringCans", "item_key": "Legendary Watering Can", "count": 1}],
    })
    assert r.status_code == 201
    # bot kosong claim → tak dapat apa-apa (204)
    _, token = _register(inventory={})
    c = client.post("/api/v1/bots/claim", headers={"Authorization": f"Bearer {token}"}, json={"inventory": {}})
    assert c.status_code == 204, c.text


def test_released_returns_to_pending():
    _, token = _register(inventory={"Seeds": {"Carrot": 10}})
    r = client.post("/api/v1/orders", headers=ADMIN, json={
        "recipient": "buyerZ",
        "items": [{"category": "Seeds", "item_key": "Carrot", "count": 3}],
    })
    order_id = r.json()["id"]
    c = client.post("/api/v1/bots/claim", headers={"Authorization": f"Bearer {token}"},
                    json={"inventory": {"Seeds": {"Carrot": 10}}})
    assert c.status_code == 200 and c.json()["id"] == order_id
    # lepas lagi → harus kembali pending (belum mencapai max_release)
    res = client.post("/api/v1/bots/result", headers={"Authorization": f"Bearer {token}"},
                      json={"order_id": order_id, "status": "released", "sent_total": 0, "error": "insufficient_stock"})
    assert res.status_code == 200
    assert res.json()["status"] == "pending"
    assert res.json()["assigned_bot"] is None


def test_revoked_bot_token_is_rejected():
    """Cabut bot → token-nya harus langsung tak berlaku."""
    username = "RevokeBot_" + uuid4().hex[:8]
    r = client.post("/api/v1/bots", headers=REG,
                    json={"name": "Revoke Bot", "username": username, "game": "Grow a Garden"})
    assert r.status_code == 201, r.text
    bot_id, token = r.json()["bot"]["id"], r.json()["token"]
    auth = {"Authorization": f"Bearer {token}"}

    # token berlaku sebelum dicabut
    assert client.post("/api/v1/bots/heartbeat", headers=auth,
                       json={"server": "x", "ping_ms": 0, "inventory": {}}).status_code == 200

    # cabut butuh admin key
    assert client.delete(f"/api/v1/bots/{bot_id}").status_code == 401
    assert client.delete(f"/api/v1/bots/{bot_id}", headers=ADMIN).status_code == 204

    # token lama ditolak
    assert client.post("/api/v1/bots/heartbeat", headers=auth,
                       json={"server": "x", "ping_ms": 0, "inventory": {}}).status_code == 401


def test_concurrent_claims_never_double_assign():
    """Banyak bot claim bersamaan → order yang sama tidak boleh diberikan 2×.

    Tanpa UPDATE bersyarat, pola baca-lalu-tulis bisa memberikan satu order ke
    beberapa bot sekaligus — artinya barang terkirim dobel ke pembeli.
    """
    import threading

    stock = {"Seeds": {"RaceSeed": 99}}
    tokens = [_register(inventory=stock)[1] for _ in range(6)]

    # satu order saja, semua bot sanggup memenuhinya
    r = client.post("/api/v1/orders", headers=ADMIN, json={
        "recipient": "raceBuyer",
        "items": [{"category": "Seeds", "item_key": "RaceSeed", "count": 1}],
    })
    assert r.status_code == 201
    order_id = r.json()["id"]

    winners: list[str] = []
    lock = threading.Lock()
    start = threading.Barrier(len(tokens))

    def claim(token: str):
        start.wait()  # semua thread menembak sedekat mungkin
        resp = client.post("/api/v1/bots/claim",
                           headers={"Authorization": f"Bearer {token}"},
                           json={"inventory": stock})
        if resp.status_code == 200 and resp.json().get("id") == order_id:
            with lock:
                winners.append(token)

    threads = [threading.Thread(target=claim, args=(t,)) for t in tokens]
    for t in threads: t.start()
    for t in threads: t.join()

    assert len(winners) == 1, f"order diklaim {len(winners)} bot — harusnya tepat 1"
