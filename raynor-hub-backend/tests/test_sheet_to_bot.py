"""Ujung-ke-ujung: baris Google Sheet → order → bot mengambilnya.

Tes impor yang lama berhenti di "order tercatat". Padahal kegagalan nyata
terjadi SETELAH itu: order tercatat rapi, lalu tak pernah bisa diklaim karena
ejaan di sheet tak persis sama dengan inventaris bot, dan berakhir
`no_bot_has_stock`. Jadi yang diuji di sini adalah sampai bot memegangnya.
"""
import http.server
import socketserver
import threading
from uuid import uuid4

from fastapi.testclient import TestClient
from app.main import app, sync_google_sheet
from app.domain.channels.entities import Channel, ChannelType
from app.infrastructure.database.session import SessionLocal
from app.infrastructure.repositories.sqlalchemy_channel_repository import SqlAlchemyChannelRepository

client = TestClient(app)
REG = {"X-Registration-Key": "test-registration-key"}

CSV = {"data": ""}

# Stok seperti yang benar-benar dipegang akun bot di game.
STOK = {
    "Seeds": {"Dragon's Breath": 5, "Star Fruit": 9},
    "Sprinklers": {"Legendary Sprinkler": 4},
    "WateringCans": {"Super Watering Can": 3},
    "Trowels": {"Trowel": 10},
    "Raccoons": {"Raccoon": 2},
}
NAMES = {}


class _Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        body = CSV["data"].encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/csv")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


def _serve():
    srv = socketserver.TCPServer(("127.0.0.1", 0), _Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}/orders.csv"


def _sync(url):
    db = SessionLocal()
    try:
        repo = SqlAlchemyChannelRepository(db)
        ch = repo.create(Channel(uuid4(), ChannelType.GOOGLE_SHEET, "Sheet", config={"csv_url": url}))
        return sync_google_sheet(db, repo.get(ch.id))
    finally:
        db.close()


def _bot():
    username = f"sheetbot_{uuid4().hex[:8]}"
    r = client.post("/api/v1/bots", headers=REG,
                    json={"name": "Sheet Bot", "username": username, "game": "Grow a Garden"})
    token = r.json()["token"]
    client.post("/api/v1/bots/heartbeat", headers={"Authorization": f"Bearer {token}"},
                json={"server": "SG", "ping_ms": 20, "inventory": STOK, "names": NAMES})
    return token


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _panen(token, awalan, batas=25):
    """Klaim berulang, kumpulkan hanya order milik tes ini.

    Modul tes lain meninggalkan order pending, dan bot di sini berstok luas
    sehingga ikut menyambarnya. Yang bukan milik kita dilepas kembali agar
    modul lain tidak terganggu.
    """
    milikku = []
    for _ in range(batas):
        r = client.post("/api/v1/bots/claim", headers=_auth(token),
                        json={"inventory": STOK, "names": NAMES})
        if r.status_code != 200:
            break
        order = r.json()
        if (order.get("note") or "").startswith(f"gsheet:{awalan}"):
            milikku.append(order)
        else:
            # Dilepas → kena cooldown retry, jadi klaim berikutnya melewatinya
            client.post("/api/v1/bots/result", headers=_auth(token),
                        json={"order_id": order["id"], "status": "released",
                              "sent_total": 0, "requested_total": 0})
    return milikku


def test_baris_dengan_ejaan_berantakan_tetap_sampai_ke_bot():
    """Ejaan apa adanya dari VCGamers — inilah yang dulu berakhir gagal."""
    srv, url = _serve()
    try:
        CSV["data"] = (
            "recipient,category,item_key,count,order_ref,source\n"
            "raynorqt,seeds,Dragon Breath,2,SHEET-A1,vcgamers\n"       # tanpa apostrof + huruf kecil
            "raynorqt,wateringcans,super watering can,1,SHEET-A2,vcgamers\n"
            "raynorqt,raccoons,Raccoon,1,SHEET-A3,vcgamers\n"
        )
        assert _sync(url)["imported"] == 3

        orders = _panen(_bot(), "SHEET-A")
        assert len(orders) == 3, "order tak terklaim padahal stok ada"
        diambil = {o["items"][0]["item_key"]: o["items"][0]["category"] for o in orders}

        # Bot mencari item di game pakai kunci ini — harus ejaan katalog, bukan sheet
        assert diambil == {
            "Dragon's Breath": "Seeds",
            "Super Watering Can": "WateringCans",
            "Raccoon": "Raccoons",
        }
    finally:
        srv.shutdown()


def test_item_yang_tak_dipunyai_tidak_diklaim():
    """Toleransi ejaan tidak boleh berubah jadi asal cocok."""
    srv, url = _serve()
    try:
        CSV["data"] = (
            "recipient,category,item_key,count,order_ref,source\n"
            "raynorqt,Seeds,Lucky Block,1,SHEET-B1,vcgamers\n"
        )
        assert _sync(url)["imported"] == 1
        assert _panen(_bot(), "SHEET-B") == []
    finally:
        srv.shutdown()


def test_stok_kurang_dari_yang_dipesan_tidak_diklaim():
    srv, url = _serve()
    try:
        CSV["data"] = (
            "recipient,category,item_key,count,order_ref,source\n"
            "raynorqt,seeds,dragon breath,99,SHEET-C1,vcgamers\n"
        )
        assert _sync(url)["imported"] == 1
        assert _panen(_bot(), "SHEET-C") == []
    finally:
        srv.shutdown()
