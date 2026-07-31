"""Klien API U7Buy.

Dipisahkan dari alur pemrosesan agar dapat diuji tanpa jaringan: cukup ganti
`opener` dengan tiruan.

Pemanggilan yang MENGUBAH status order sungguhan di marketplace
(`start_delivery`, `complete_delivery`) dijaga oleh `callback_enabled`. Selama
mati, panggilan itu hanya dicatat ke log dan tidak dikirim — supaya sistem bisa
dijalankan penuh tanpa menyentuh order pembeli.
"""
from __future__ import annotations

import base64
import json
import urllib.error
import urllib.parse
import urllib.request


class U7BuyError(RuntimeError):
    pass


class U7BuyClient:
    def __init__(self, app_id: str, app_secret: str, base_url: str,
                 callback_enabled: bool = False, stock_sync_enabled: bool = False,
                 timeout: int = 20, opener=None):
        self.app_id = app_id
        self.app_secret = app_secret
        self.base_url = base_url.rstrip("/")
        self.callback_enabled = callback_enabled
        self.stock_sync_enabled = stock_sync_enabled
        self.timeout = timeout
        self._opener = opener or self._http

    # ---------- transport ----------

    def _http(self, url: str, method: str, body: bytes | None) -> tuple[int, str]:
        creds = base64.b64encode(f"{self.app_id}:{self.app_secret}".encode()).decode()
        req = urllib.request.Request(url, data=body, method=method, headers={
            "Authorization": f"Basic {creds}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        })
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return resp.status, resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode("utf-8", errors="replace")

    def _call(self, path: str, params: dict | None = None,
              method: str = "GET", body: dict | None = None) -> dict:
        url = self.base_url + path
        if params:
            url += "?" + urllib.parse.urlencode(params)
        payload = json.dumps(body).encode() if body is not None else None

        status, text = self._opener(url, method, payload)
        try:
            data = json.loads(text) if text else {}
        except ValueError:
            raise U7BuyError(f"balasan bukan JSON (HTTP {status}): {text[:200]}")

        if status != 200:
            raise U7BuyError(f"HTTP {status}: {str(data)[:200]}")
        # U7Buy memakai kode di dalam body; HTTP 200 saja belum berarti berhasil.
        if data.get("code") != 200:
            raise U7BuyError(f"code={data.get('code')} msg={data.get('msg')!r}")
        return data.get("data") or {}

    # ---------- baca ----------

    def get_order(self, order_id: str) -> dict:
        return self._call(f"/open-api/order/{order_id}")

    def list_orders(self, page: int = 1) -> dict:
        # Ukuran halaman terkunci 10 di sisi U7Buy; parameter ukuran diabaikan.
        return self._call("/open-api/order/list", {"pageNum": page})

    def find_business_id(self) -> str:
        """`businessId` diambil dari satu order mana pun — endpoint offer
        mewajibkannya, dan nilainya tidak muncul di tempat lain."""
        for r in (self.list_orders(1).get("rows") or []):
            if r.get("businessId"):
                return str(r["businessId"])
        return ""

    def list_offers(self, business_id: str, page: int = 1, page_size: int = 50) -> dict:
        """Katalog listing penjual.

        Berbeda dari riwayat order, di sini `pageSize` DIHORMATI. Kuncinya juga
        berbeda: `totalCount` + `pageResult`, bukan `total` + `rows`.
        """
        return self._call("/open-api/offer_common/list", {
            "pageNum": page, "pageSize": page_size, "businessId": business_id,
        })

    def all_offers(self, business_id: str, max_pages: int = 20) -> list[dict]:
        keluar: list[dict] = []
        for halaman in range(1, max_pages + 1):
            data = self.list_offers(business_id, halaman)
            baris = data.get("pageResult") or []
            if not baris:
                break
            keluar.extend(baris)
            if len(keluar) >= int(data.get("totalCount") or 0):
                break
        return keluar

    def get_offer(self, offer_id: str) -> dict:
        return self._call(f"/open-api/game_service_offer/{offer_id}")

    def set_offer_inventory(self, offer_id: str, inventory: int) -> dict | None:
        """Ubah stok satu listing. None bila sinkron stok belum dinyalakan.

        Dokumentasi U7Buy tidak merinci isi body PUT-nya, sedangkan objek offer
        memuat harga dan deskripsi. Mengirim body susunan sendiri berisiko
        mengosongkan field yang tidak disertakan.

        Karena itu offer dibaca lebih dulu, lalu dikirim balik APA ADANYA dengan
        satu perubahan: `inventory`. Field lain tak tersentuh karena nilainya
        berasal dari server itu sendiri.
        """
        if not self.stock_sync_enabled:
            print(f"[u7buy] ubah stok offer {offer_id} -> {inventory} DILEWATI "
                  f"(U7BUY_STOCK_SYNC_ENABLED belum dinyalakan)")
            return None

        sekarang = self.get_offer(offer_id)
        if int(sekarang.get("inventory") or 0) == inventory:
            return None  # sudah sesuai, jangan kirim permintaan sia-sia

        body = dict(sekarang)
        body["inventory"] = inventory
        hasil = self._call("/open-api/game_service_offer", method="PUT", body=body)
        print(f"[u7buy] stok offer {offer_id}: "
              f"{sekarang.get('inventory')} -> {inventory}")
        return hasil

    def get_buyer_username(self, order_id: str) -> str | None:
        """Username Roblox pembeli, dari parameter pengiriman.

        Nilainya kerap membawa spasi di ujung ("Sssirdiii "), dan spasi itu
        membuat pencarian pemain di dalam game gagal. Karena itu selalu dipangkas.
        """
        data = self._call("/open-api/order/delivery_param_info", {"orderId": order_id})
        for p in data.get("deliveryParams") or []:
            if str(p.get("name") or "").strip().lower() == "roblox username":
                nilai = str(p.get("value") or "").strip()
                if nilai:
                    return nilai
        return None

    # ---------- ubah status (dijaga) ----------

    def start_delivery(self, order_id: str) -> bool:
        return self._callback("start_deliery", order_id)

    def complete_delivery(self, order_id: str) -> bool:
        return self._callback("complete_deliery", order_id)

    def _callback(self, aksi: str, order_id: str) -> bool:
        """Kirim penanda status ke U7Buy. Mengembalikan True bila benar-benar dikirim.

        Ejaan `deliery` memang begitu di dokumentasi U7Buy — bukan salah ketik
        di sini.
        """
        if not self.callback_enabled:
            print(f"[u7buy] {aksi} untuk order {order_id} DILEWATI "
                  f"(U7BUY_CALLBACK_ENABLED belum dinyalakan)")
            return False
        self._call(f"/open-api/order/{aksi}", method="POST", body={"orderId": order_id})
        print(f"[u7buy] {aksi} terkirim untuk order {order_id}")
        return True
