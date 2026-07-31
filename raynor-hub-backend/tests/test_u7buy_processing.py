"""Event webhook U7Buy → order di antrean kita.

Seluruh panggilan jaringan digantikan tiruan: tes ini tidak boleh menyentuh
marketplace sungguhan, apalagi mengubah status order pembeli.
"""
import json
from uuid import uuid4

import pytest

from app.core.config import settings
from app.domain.channels.entities import Channel, ChannelType
from app.infrastructure.database.session import SessionLocal
from app.infrastructure.marketplaces.u7buy_client import U7BuyClient, U7BuyError
from app.infrastructure.repositories.sqlalchemy_channel_repository import SqlAlchemyChannelRepository
from app.infrastructure.repositories.sqlalchemy_order_repository import SqlAlchemyOrderRepository
from app.infrastructure.repositories.sqlalchemy_webhook_repository import SqlAlchemyWebhookRepository
import app.main as main
from fastapi.testclient import TestClient

client = TestClient(main.app)

TROWEL_PID = "2066975692396105730"
PEPPER_PID = "2066921934194675713"

PRODUCT_MAP = {
    TROWEL_PID: {"category": "Trowels", "item_key": "Trowel", "per_unit": 150},
    PEPPER_PID: {"category": "Seeds", "item_key": "Ghost Pepper", "per_unit": 1},
}


class KlienPalsu:
    """Menirukan U7BuyClient. Mencatat callback alih-alih mengirimnya."""

    def __init__(self, detail=None, username="Yk2w80", gagal_detail=False):
        self.detail = detail or {}
        self.username = username
        self.gagal_detail = gagal_detail
        self.dikirim = []

    def get_order(self, order_id):
        if self.gagal_detail:
            raise U7BuyError("HTTP 500")
        return self.detail

    def get_buyer_username(self, order_id):
        return self.username

    def start_delivery(self, order_id):
        self.dikirim.append(("start", order_id)); return True

    def complete_delivery(self, order_id):
        self.dikirim.append(("complete", order_id)); return True


def _channel(peta=None):
    db = SessionLocal()
    try:
        repo = SqlAlchemyChannelRepository(db)
        for ch in repo.list():
            if ch.type == ChannelType.U7BUY:
                repo.delete(ch.id)
        ch = Channel(uuid4(), ChannelType.U7BUY, "U7Buy",
                     config={"product_map": peta if peta is not None else PRODUCT_MAP})
        ch.enabled = True
        return repo.create(ch)
    finally:
        db.close()


def _event(order_id, event="new_order_received"):
    db = SessionLocal()
    try:
        payload = json.dumps({"event": event, "data": {"orderId": order_id}})
        row, _ = SqlAlchemyWebhookRepository(db).record(
            "u7buy", event, f"{event}:{order_id}", payload)
        return row.id
    finally:
        db.close()


def _jalankan(klien):
    db = SessionLocal()
    try:
        return main.process_u7buy_events(db), db
    finally:
        pass


def _status_event(event_id):
    db = SessionLocal()
    try:
        for row in SqlAlchemyWebhookRepository(db).recent(200):
            if row.id == event_id:
                return row.status, row.error
        return None, None
    finally:
        db.close()


def _order_dari_note(note):
    db = SessionLocal()
    try:
        for o in SqlAlchemyOrderRepository(db).list():
            if (o.note or "") == note:
                return o
        return None
    finally:
        db.close()


@pytest.fixture
def pasang(monkeypatch):
    """Kredensial palsu + klien tiruan, dikembalikan otomatis setelah tes."""
    monkeypatch.setattr(settings, "u7buy_app_id", "test-id")
    monkeypatch.setattr(settings, "u7buy_app_secret", "test-secret")
    monkeypatch.setattr(settings, "u7buy_game_name", "Grow a Garden 2")

    def pakai(klien):
        monkeypatch.setattr(main, "u7buy_client", lambda: klien)
        return klien
    return pakai


def test_order_dibuat_dengan_jumlah_dikali_per_unit(pasang):
    """150x Trowel: jumlahnya ada di nama produk, bukan di field quantity."""
    _channel()
    oid = "2083077412744859656"
    eid = _event(oid)
    klien = pasang(KlienPalsu(detail={
        "gameName": "Grow a Garden 2", "productId": TROWEL_PID,
        "productName": "150x Trowel | Grow A Garden 2", "quantity": 2,
    }))

    db = SessionLocal()
    try:
        assert main.process_u7buy_events(db) == 1
    finally:
        db.close()

    order = _order_dari_note(f"u7buy:{oid}")
    assert order is not None
    assert order.recipient == "Yk2w80"
    assert order.source == "u7buy"
    assert order.items[0].category == "Trowels"
    assert order.items[0].item_key == "Trowel"
    assert order.items[0].count == 300          # 2 unit × 150 per unit
    assert _status_event(eid)[0] == "processed"
    assert klien.dikirim == [("start", oid)]


def test_order_game_lain_diabaikan(pasang):
    """Empat dari lima order di akun ini bukan game yang dimainkan bot."""
    _channel()
    oid = "9000000000000000001"
    eid = _event(oid)
    pasang(KlienPalsu(detail={
        "gameName": "Steal A Brainrot", "productId": "999", "quantity": 1,
    }))

    db = SessionLocal()
    try:
        assert main.process_u7buy_events(db) == 0
    finally:
        db.close()

    status, alasan = _status_event(eid)
    assert status == "ignored" and "Steal A Brainrot" in alasan
    assert _order_dari_note(f"u7buy:{oid}") is None


def test_produk_tak_dipetakan_ditandai_bukan_ditebak(pasang):
    _channel()
    oid = "9000000000000000002"
    eid = _event(oid)
    pasang(KlienPalsu(detail={
        "gameName": "Grow a Garden 2", "productId": "belum-ada",
        "productName": "Sesuatu Yang Baru", "quantity": 1,
    }))

    db = SessionLocal()
    try:
        assert main.process_u7buy_events(db) == 0
    finally:
        db.close()

    status, alasan = _status_event(eid)
    assert status == "failed" and "belum dipetakan" in alasan
    assert _order_dari_note(f"u7buy:{oid}") is None


def test_username_kosong_tidak_menghasilkan_order(pasang):
    """Order tanpa penerima tak ada gunanya, dan bisa terkirim ke akun keliru."""
    _channel()
    oid = "9000000000000000003"
    eid = _event(oid)
    pasang(KlienPalsu(detail={
        "gameName": "Grow a Garden 2", "productId": PEPPER_PID, "quantity": 1,
    }, username=None))

    db = SessionLocal()
    try:
        assert main.process_u7buy_events(db) == 0
    finally:
        db.close()

    assert _status_event(eid)[0] == "failed"
    assert _order_dari_note(f"u7buy:{oid}") is None


def test_event_selain_order_baru_dilewati(pasang):
    _channel()
    oid = "9000000000000000004"
    eid = _event(oid, event="stock_runs_out")
    pasang(KlienPalsu())

    db = SessionLocal()
    try:
        assert main.process_u7buy_events(db) == 0
    finally:
        db.close()

    assert _status_event(eid)[0] == "ignored"


def test_event_yang_sudah_diproses_tidak_diulang(pasang):
    """Kalau diulang, pembeli menerima barangnya dua kali."""
    _channel()
    oid = "9000000000000000005"
    _event(oid)
    klien = pasang(KlienPalsu(detail={
        "gameName": "Grow a Garden 2", "productId": PEPPER_PID, "quantity": 1,
    }))

    db = SessionLocal()
    try:
        assert main.process_u7buy_events(db) == 1
        assert main.process_u7buy_events(db) == 0     # putaran kedua: tak ada lagi
    finally:
        db.close()
    assert klien.dikirim == [("start", oid)]


def test_callback_mati_secara_default_tidak_menyentuh_marketplace():
    """Pengaman utama: tanpa dinyalakan, status order pembeli tak boleh berubah."""
    dipanggil = []

    def opener(url, method, body):
        dipanggil.append(url)
        return 200, '{"code":200,"msg":"ok","data":{}}'

    klien = U7BuyClient("id", "secret", "https://contoh.invalid",
                        callback_enabled=False, opener=opener)
    assert klien.complete_delivery("123") is False
    assert klien.start_delivery("123") is False
    assert dipanggil == []          # tidak ada satu pun permintaan keluar


def test_callback_dikirim_saat_dinyalakan():
    keluar = []

    def opener(url, method, body):
        keluar.append((method, url))
        return 200, '{"code":200,"msg":"ok","data":{}}'

    klien = U7BuyClient("id", "secret", "https://contoh.invalid",
                        callback_enabled=True, opener=opener)
    assert klien.complete_delivery("123") is True
    assert keluar == [("POST", "https://contoh.invalid/open-api/order/complete_deliery")]


def test_spasi_di_username_dipangkas():
    """Nilai dari U7Buy kerap berspasi ("Sssirdiii "), dan itu menggagalkan
    pencarian pemain di dalam game."""
    def opener(url, method, body):
        return 200, json.dumps({"code": 200, "msg": "ok", "data": {
            "deliveryParams": [{"name": "Roblox Username", "value": "Sssirdiii "}]
        }})

    klien = U7BuyClient("id", "secret", "https://contoh.invalid", opener=opener)
    assert klien.get_buyer_username("1") == "Sssirdiii"


def test_kode_galat_dalam_body_dianggap_gagal():
    """U7Buy mengembalikan HTTP 200 walau operasinya gagal; kode ada di body."""
    def opener(url, method, body):
        return 200, '{"code":401,"msg":"unauthorized"}'

    klien = U7BuyClient("id", "secret", "https://contoh.invalid", opener=opener)
    with pytest.raises(U7BuyError):
        klien.get_order("1")


# ---- usulan pemetaan dari nama listing ----

from app.infrastructure.marketplaces.u7buy_catalog import suggest  # noqa: E402


def test_jumlah_per_unit_dibaca_dari_judul_listing():
    assert suggest("150x Trowel | Grow A Garden 2 | Instant Delivery") == {
        "category": "Trowels", "item_key": "Trowel", "per_unit": 150,
    }


def test_kata_seed_di_belakang_dibuang():
    """Katalog game menyimpan "Ghost Pepper"; Seeds adalah kategori bernama ketat,
    sehingga "Ghost Pepper Seed" benar-benar ditolak saat dikirim."""
    assert suggest("Ghost Pepper Seed | Grow A Garden 2")["item_key"] == "Ghost Pepper"
    assert suggest("Ghost Pepper Seed | Grow A Garden 2")["category"] == "Seeds"


def test_seed_pack_tidak_jatuh_ke_seeds():
    assert suggest("Secret Seed Pack | Grow A Garden 2")["category"] == "SeedPacks"


def test_kategori_yang_tak_bisa_ditentukan_dibiarkan_kosong():
    """Pet tidak punya kata kunci di namanya — lebih baik kosong daripada salah."""
    assert suggest("Unicorn | Grow A Garden 2 | Instant Delivery")["category"] == ""


# ---- sinkron stok listing ----

class KlienStok:
    """Tiruan klien untuk rencana & penerapan stok."""

    def __init__(self, offers, stock_sync_enabled=False):
        self._offers = offers
        self.stock_sync_enabled = stock_sync_enabled
        self.ditulis = []

    def find_business_id(self):
        return "bisnis-1"

    def all_offers(self, business_id, max_pages=20):
        return self._offers

    def set_offer_inventory(self, offer_id, inventory):
        if not self.stock_sync_enabled:
            return None
        self.ditulis.append((offer_id, inventory))
        return {}


def _offer(pid, nama, stok, terjual=0):
    return {"offerId": pid, "offerName": nama, "inventory": stok,
            "saleNum": terjual, "onSale": 1, "entityName": "Grow a Garden 2"}


def _skenario(per_unit=150, punya=0):
    """Satu produk dengan nama item yang unik untuk tes ini.

    Stok dijumlahkan dari SELURUH bot online, termasuk sisa modul tes lain.
    Nama unik membuat hasilnya pasti tanpa bergantung pada urutan modul.
    """
    tag = uuid4().hex[:8]
    pid, item = f"pid{tag}", f"TrowelUji{tag}"
    _channel({pid: {"category": "Trowels", "item_key": item, "per_unit": per_unit}})

    nama = f"botstok{tag}"
    r = client.post("/api/v1/bots", headers={"X-Registration-Key": "test-registration-key"},
                    json={"name": "Stok Bot", "username": nama, "game": "Grow a Garden"})
    token = r.json()["token"]
    client.post("/api/v1/bots/heartbeat", headers={"Authorization": f"Bearer {token}"},
                json={"server": "SG", "ping_ms": 1,
                      "inventory": {"Trowels": {item: punya}}, "names": {}})
    return pid


def _rencana():
    db = SessionLocal()
    try:
        return main.u7buy_stock_plan(db)
    finally:
        db.close()


def test_rencana_membandingkan_stok_listing_dengan_stok_bot(pasang):
    """Angka di marketplace adalah yang diketik penjual, bukan yang benar-benar ada."""
    pid = _skenario(per_unit=150, punya=1500)
    pasang(KlienStok([_offer(pid, "150x Trowel", 4, terjual=7)]))

    r = _rencana()["items"][0]
    assert r["bot_stock"] == 1500
    assert r["should_be"] == 10          # 1500 / 150 per unit
    assert r["action"] == "naikkan"


def test_stok_habis_ditandai_paling_mendesak(pasang):
    """Listing yang menjual barang yang tak ada sama sekali."""
    pid = _skenario(per_unit=1, punya=0)
    pasang(KlienStok([_offer(pid, "Ghost Pepper Seed", 18, terjual=55)]))

    hasil = _rencana()
    assert hasil["items"][0]["should_be"] == 0
    assert hasil["items"][0]["action"] == "kosongkan"
    assert hasil["mismatched"] == 1
    assert hasil["can_apply"] is False


def test_pembulatan_ke_bawah_tidak_menjanjikan_unit_yang_tak_utuh(pasang):
    """149 trowel bukan 1 unit "150x Trowel" — menjualnya berarti gagal."""
    pid = _skenario(per_unit=150, punya=149)
    pasang(KlienStok([_offer(pid, "150x Trowel", 1)]))
    assert _rencana()["items"][0]["should_be"] == 0


def test_penerapan_ditolak_saat_belum_dinyalakan(pasang):
    """Pengaman utama: listing memuat harga dan deskripsi yang tak boleh rusak."""
    pid = _skenario(per_unit=150, punya=300)
    klien = pasang(KlienStok([_offer(pid, "150x Trowel", 1)]))

    r = client.post("/api/v1/u7buy/stock-sync", headers={"X-Admin-Key": "test-admin-key"})
    assert r.status_code == 409
    assert klien.ditulis == []          # tak satu pun listing disentuh


def test_penerapan_menulis_saat_dinyalakan(pasang, monkeypatch):
    pid = _skenario(per_unit=150, punya=300)
    monkeypatch.setattr(settings, "u7buy_stock_sync_enabled", True)
    klien = pasang(KlienStok([_offer(pid, "150x Trowel", 1)], stock_sync_enabled=True))

    r = client.post("/api/v1/u7buy/stock-sync", headers={"X-Admin-Key": "test-admin-key"})
    assert r.status_code == 200
    assert klien.ditulis == [(pid, 2)]     # 300 / 150 = 2 unit


def test_listing_belum_dipetakan_tidak_disentuh(pasang):
    """Sinkron stok hanya mengurus produk yang kita tahu isinya apa."""
    _skenario(per_unit=1, punya=5)
    pasang(KlienStok([_offer("produk-asing", "Sesuatu", 99)]))
    assert _rencana()["items"] == []
