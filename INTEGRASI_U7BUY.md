# Integrasi U7Buy

Catatan riset + status pengerjaan integrasi marketplace U7Buy.

---

## Kenapa U7Buy (dan bukan Eldorado)

| | U7Buy | Eldorado.gg |
|---|---|---|
| API resmi publik | ✅ terdokumentasi | ❌ tidak ditemukan |
| Webhook | ✅ ada | — |
| Sandbox | disebutkan di situs | — |

Eldorado.gg tidak menerbitkan dokumentasi API seller publik. Yang beredar hanya
scraper pihak ketiga, bukan resmi. Kalau tetap ingin Eldorado, jalurnya adalah
menanyakan langsung ke support mereka soal program partner/seller API.

⚠️ **Jangan tertukar:** `api.eldorado.io` adalah perusahaan **fintech/kripto**,
sama sekali bukan eldorado.gg si marketplace game.

---

## Ringkasan API U7Buy

**Base URL:** `https://openapi.u7buy.com/prod-api`
**Auth:** `Authorization: Basic {Base64(AppId:AppSecret)}`
**Format balasan:** `{"code": 200, "msg": "success", "data": ...}`

### Endpoint order

| Fungsi | Method & path |
|---|---|
| Daftar order | `GET /open-api/order/list` |
| Detail order | `GET /open-api/order/{orderId}` |
| Parameter pengiriman (data dari pembeli) | `GET /open-api/order/delivery_param_info` |
| Mulai kirim | `POST /open-api/order/start_deliery` |
| Konfirmasi selesai | `POST /open-api/order/complete_deliery` |

*(ejaan `deliery` memang begitu di dokumentasi mereka)*

**Status order:** Preparing (2) → Delivering (3) → To Receive (4) → Completed (5)

### Webhook

Event: `new_order_received`, `order_completed`, `stock_reaches_threshold`, `stock_runs_out`

```json
{"event": "new_order_received", "timestamp": "1757670260992",
 "data": {"orderId": 1966432766178033667}}
```

- Balasan **wajib** `{"status": "OK"}` dengan HTTP 200, dalam **5 detik**
- Gagal → diulang 5× pada menit ke 1, 2, 5, 10, 20
- Tanda tangan: HMAC-SHA256 atas `AppId + "," + parameter`, hasil Raw Hex

---

## Rencana alur

```
Webhook "new_order_received"
  → verifikasi tanda tangan → simpan event → balas {"status":"OK"}   ← SELESAI
       ↓ (pemrosesan terpisah)
  → GET /open-api/order/{orderId}            detail order
  → GET .../delivery_param_info              username Roblox pembeli
  → petakan produk U7Buy → category/item_key katalog game
  → POST /api/v1/orders                      masuk antrean kita
  → POST .../start_deliery                   tandai "Delivering" di U7Buy
       ↓ bot kirim & verifikasi inventory turun
  → POST .../complete_deliery                tandai selesai di U7Buy
```

---

## Status

### ✅ Tahap 1 — Penerima webhook (SELESAI)

- `POST /api/v1/webhooks/u7buy` — verifikasi tanda tangan, simpan, balas cepat
- `GET /api/v1/webhooks/events` (admin) — riwayat & diagnosis
- Tabel `webhook_events` dengan `dedupe_key` unik → pengulangan tidak dobel
- Setelan di `.env`: `U7BUY_APP_ID`, `U7BUY_APP_SECRET`, `U7BUY_SIGNATURE_HEADER`,
  `U7BUY_VERIFY_SIGNATURE`

**Teruji:** tanda tangan valid → `200 {"status":"OK"}`; kiriman ulang → tetap OK
tapi hanya tersimpan sekali; tanda tangan salah/kosong → `401`.
4 test otomatis (`tests/test_u7buy_webhook.py`).

### ✅ Bentuk data nyata (terverifikasi lewat `scripts/u7buy_probe.py`)

Kredensial terpasang, API terhubung, **848 order** terbaca.

**Username pembeli — inilah yang dicari:**
```json
GET /open-api/order/delivery_param_info?orderId=...
{
  "code": 200,
  "data": {
    "deliveryParams": [
      { "name": "Roblox Username", "value": "Sssirdiii " }
    ]
  }
}
```
Ambil dari `data.deliveryParams[]` yang `name == "Roblox Username"`.
⚠️ **Nilainya bisa ada spasi di ujung** (`'Sssirdiii '`) — wajib `.strip()`,
kalau tidak `GetUserIdFromNameAsync` akan gagal.

**Field order yang relevan** (`/open-api/order/list` & `/{orderId}`):

| Field | Contoh | Kegunaan |
|---|---|---|
| `orderId` | `2082900605021990915` | kunci utama, untuk dedup & callback |
| `productId` | `2066921934194675713` | **kunci pemetaan produk** |
| `productName` | `Ghost Pepper Seed \| Grow A Garden 2 \| Instant Delivery` | acuan manusia |
| `quantity` | `2` | jumlah yang dibeli |
| `orderStatus` / `orderStatusName` | `4` / `To Receive` | 2=Preparing, 3=Delivering, 4=To Receive, 5=Completed |
| `deliveryMethod` | `Gifting` | cocok dengan cara kerja bot kita |
| `deliveryFlag` | `0` | penanda sudah dikirim atau belum |
| `gameName` | `Grow a Garden 2` | filter game |

**Catatan penamaan:** produk U7Buy pakai nama panjang ("Ghost Pepper **Seed**"),
sedangkan `item_key` katalog game tanpa akhiran itu (`Ghost Pepper`, kategori
`Seeds`). Jadi pemetaan **tidak bisa** ditebak dari nama — harus tabel eksplisit
`productId` → (`category`, `item_key`, `qty_per_unit`).

### 🚧 Tahap 2 — Klien API + pemetaan produk (BELUM)

Yang masih dibutuhkan: **tabel pemetaan `productId` → item game**.
Rencana simpan di `config` channel U7Buy, bentuknya:
```json
{
  "product_map": {
    "2066921934194675713": {"category": "Seeds", "item_key": "Ghost Pepper", "per_unit": 1}
  }
}
```
`per_unit` untuk produk paket (mis. satu order = 10 buah).

### 🚧 Tahap 3 — Sambungkan ke alur order (BELUM)

Otomatis penuh: webhook → order → bot kirim → `complete_deliery`.

---

## Dua hal yang belum pasti dari dokumentasi

**1. Nama header tanda tangan.** Dokumentasi U7Buy tidak menyebutkannya. Default
kita `x-signature`, bisa diubah lewat `U7BUY_SIGNATURE_HEADER`.

**2. String yang ditandatangani.** Dokumentasi hanya menulis "sambungkan App ID
dan parameter request dengan ','" tanpa contoh. Implementasi kita mencoba tiga
tafsir (body mentah, JSON compact, JSON compact terurut) dan menerima bila salah
satu cocok.

**Cara mencocokkan saat webhook asli pertama masuk:**
1. Kirim satu order uji di U7Buy
2. Lihat log backend — saat verifikasi gagal, log menampilkan **seluruh header**
   yang diterima dan **semua kandidat tanda tangan** yang kita hitung
3. Cocokkan: set `U7BUY_SIGNATURE_HEADER` ke nama header yang benar; kalau tak
   ada kandidat yang cocok, kirimkan lognya agar rumusnya bisa disesuaikan

Kalau mentok, `U7BUY_VERIFY_SIGNATURE=false` untuk sementara agar tidak terblokir
— **tapi jangan dibiarkan** di produksi, karena artinya siapa pun bisa mengirim
webhook palsu ke endpoint itu.

---

## Sumber
- [Getting Started](https://openapi.u7buy.com/v1/docs/GetStarted.html)
- [OrderManageApi](https://openapi.u7buy.com/v1/docs/Apis/OrderManageApi.html)
- [Webhooks](https://openapi.u7buy.com/v1/docs/Webhooks.html)
- [Dokumentasi lengkap](https://openapi.u7buy.com/)
