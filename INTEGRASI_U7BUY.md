# Integrasi U7Buy

Catatan riset + status pengerjaan integrasi marketplace U7Buy.

---

## Kenapa U7Buy lebih dulu

| | U7Buy | Eldorado.gg |
|---|---|---|
| API seller | ✅ terdokumentasi publik | ✅ ada, dokumentasi **lewat email** |
| Webhook | ✅ | belum diketahui |
| Syarat pakai | kredensial dari portal | **50 penjualan** di Eldorado |
| Ubah stok listing | ⚠️ body PUT tak terdokumentasi | ✅ disebut eksplisit |

**Koreksi (31 Juli 2026):** catatan lama di sini menyatakan Eldorado tidak punya
API seller publik. Itu benar saat diriset, tapi sudah tidak berlaku — Eldorado
menerbitkan halaman "Using the Eldorado Seller API" yang diperbarui pekan ini.

⚠️ **Jangan tertukar:** `api.eldorado.io` adalah perusahaan **fintech/kripto**,
sama sekali bukan eldorado.gg si marketplace game.

### Eldorado Seller API — yang sudah diketahui

**Syarat:** 50 penjualan di Eldorado. Metode login apa pun (Google/Apple/
Facebook/email) tidak berpengaruh.

**Cakupannya:**

| Bagian | Kemampuan |
|---|---|
| Offer | buat, ubah, jeda, lanjutkan, hapus — currency, top-up, item, akun, boosting |
| Offer | **ubah harga, jumlah, dan waktu pengiriman** — per offer atau satu game sekaligus |
| Offer | unggah massal lewat CSV |
| Order | lihat order, tandai terkirim, batalkan, perbaiki detail pengiriman, buat invoice |

**Yang belum tercakup:** saldo & penarikan, pesan/sengketa/ulasan, pengaturan
akun, gambar offer, laporan penjualan.

**Penghalang:** dokumentasi lengkap dan instruksi kunci **tidak publik** — harus
diminta lewat `api@eldorado.gg`. Jadi integrasi belum bisa dimulai sampai kunci
dan dokumennya ada.

**Catatan menarik untuk kita:** "ubah jumlah" disebut eksplisit sebagai
kemampuan resmi. Di U7Buy hal yang sama harus ditebak (salin balik objek offer),
karena body PUT-nya tak terdokumentasi. Kalau Eldorado tersambung, sinkron stok
di sana justru lebih aman daripada di U7Buy.

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

### ✅ Pemetaan produk — sudah terkumpul (`scripts/u7buy_products.py`)

Skrip ini menelusuri seluruh riwayat order, mengumpulkan produk yang berbeda,
dan mengusulkan pemetaannya. READ-ONLY.

```bash
.venv/Scripts/python.exe scripts/u7buy_products.py          # tabel terbaca manusia
.venv/Scripts/python.exe scripts/u7buy_products.py --json   # kerangka product_map
```

**Hasil penelusuran 850 order:**

| Game | Jumlah order | Ditangani bot? |
|---|---|---|
| Steal A Brainrot | 680 | ❌ game lain |
| Grow a Garden 2 | 170 | ✅ |

> **Wajib menyaring `gameName`.** Empat dari lima order di akun ini bukan Grow a
> Garden 2. Memproses semuanya berarti bot mencoba mengirim item yang tidak ada
> di game yang dimainkannya.

Untuk Grow a Garden 2 hanya ada **2 produk berbeda**, masing-masing 85 order:

```json
{
  "product_map": {
    "2066975692396105730": {"category": "Trowels", "item_key": "Trowel",       "per_unit": 150},
    "2066921934194675713": {"category": "Seeds",   "item_key": "Ghost Pepper", "per_unit": 1}
  }
}
```

**`per_unit` bukan hal opsional.** Satu order produk pertama berarti **150 buah**
Trowel, karena jumlahnya tertanam di nama produk (`150x Trowel | ...`). Salah
membaca ini berarti pembeli menerima 1 dari 150 yang dibayarnya.

### Batas teknis yang sudah diverifikasi ke game

| Hal | Nilai | Sumber |
|---|---|---|
| Ukuran halaman `order/list` | **terkunci 10**, tak bisa diubah | diuji: `pageSize`, `page_size`, `size`, `limit` semuanya diabaikan |
| Batas satu tumpukan kiriman | 1.000.000 | `ItemCatalog.MAX_STACK_DEFAULT` |
| 150 buah dalam satu kiriman | diizinkan | `IsStackCountAllowed(150)` → true |
| `Seeds` bernama ketat | ya | `STRICT_NAME_CATEGORIES = {Seeds = true}` |

Konsekuensi dari baris terakhir, dan ini yang paling penting:

```lua
IsKnownStackableItem("Seeds", "Ghost Pepper")       --> true
IsKnownStackableItem("Seeds", "Ghost Pepper Seed")  --> false   ← ditolak game
```

Nama produk U7Buy **tidak boleh** diteruskan apa adanya. Untuk kategori `Seeds`,
game memvalidasi nama terhadap daftar benih yang sah, dan `"Ghost Pepper Seed"`
tidak ada di daftar itu. Ini bukan soal kerapian — kirimannya benar-benar gagal.

### ✅ Tahap 3 — Tersambung ke alur order

Webhook hanya menyimpan dan membalas cepat (U7Buy menunggu maksimal 5 detik).
Pekerjaan sesungguhnya berjalan terpisah tiap `U7BUY_PROCESS_INTERVAL_SECONDS`:

```
event tertunda
  → GET /open-api/order/{id}              detail order
  → saring gameName                       game lain → ditandai "ignored"
  → cari productId di product_map         tak ada → ditandai "failed", tidak ditebak
  → GET .../delivery_param_info           username pembeli (dipangkas spasinya)
  → buat Order  (quantity × per_unit)     masuk antrean, source="u7buy"
  → POST .../start_deliery                ← hanya bila callback dinyalakan
       ↓ bot kirim & verifikasi stok turun
  → POST .../complete_deliery             ← hanya bila callback dinyalakan
```

Setiap event berakhir dengan status yang menjelaskan dirinya: `processed`,
`ignored` (beserta alasan, mis. game lain), atau `failed` (beserta alasan, mis.
produk belum dipetakan). Tidak ada event yang dicoba berulang tanpa henti,
tidak ada pula yang hilang diam-diam.

**Pemetaan produk disimpan di `config` channel U7Buy**, bukan di berkas setelan,
sehingga dapat diubah tanpa menyalakan ulang backend.

### ✅ Sinkron stok listing

Angka stok di marketplace adalah yang DIKETIK penjual. Selisihnya terhadap stok
bot baru ketahuan saat ada yang membeli — dan saat itu pembeli sudah membayar.
Per 31 Juli: Ghost Pepper terjual 55× dengan stok bot **nol**.

`GET /api/v1/u7buy/stock-plan` membandingkan keduanya. HANYA MEMBACA.

```
unit yang sanggup dijual = stok bot / per_unit   (dibulatkan ke bawah)
```

Pembulatan ke bawah disengaja: 149 trowel bukan satu unit "150x Trowel", dan
menjualnya sama saja dengan menjanjikan kegagalan.

`POST /api/v1/u7buy/stock-sync` menuliskannya, dan **ditolak** kecuali
`U7BUY_STOCK_SYNC_ENABLED` dinyalakan.

⚠️ Body `PUT /open-api/game_service_offer` **tidak terdokumentasi**, sedangkan
objek offer memuat harga dan deskripsi. Karena itu penulisan dilakukan dengan
membaca offer lebih dulu lalu mengirimnya balik apa adanya, hanya `inventory`
yang diubah — field lain tak tersentuh karena nilainya berasal dari server
sendiri. Tetap **uji pada satu listing bernilai rendah** sebelum dipercaya.

#### ⚠️ Callback ke U7Buy mati secara default

`U7BUY_CALLBACK_ENABLED=false` berarti `start_deliery` dan `complete_deliery`
**tidak dikirim** — hanya dicatat ke log. Seluruh alur lain tetap berjalan penuh,
sehingga integrasi ini dapat diuji tanpa mengubah status order pembeli yang
sesungguhnya.

Nyalakan hanya setelah satu order uji terbukti berjalan benar dari ujung ke
ujung. Sesudah dinyalakan, sistem akan menandai order pembeli sebagai selesai di
marketplace — tindakan yang tidak dapat dibatalkan dari sisi kita.

**Teruji:** 10 test otomatis (`tests/test_u7buy_processing.py`), seluruh
panggilan jaringan digantikan tiruan. Termasuk pengujian bahwa dengan callback
mati, **tidak ada satu pun permintaan keluar** yang dikirim.

---

## Tombol "Check" di portal seller

Tombol itu **bukan** webhook bertanda tangan. Yang dikirim (terekam dari log):

```
POST /api/v1/webhooks/u7buy
content-length: 0
content-type: application/x-www-form-urlencoded;charset=UTF-8
user-agent: ... Hutool
(tidak ada header tanda tangan sama sekali)
```

Body kosong, tanpa tanda tangan — sekadar menguji apakah URL-nya hidup. Menolaknya
membuat portal melaporkan **"faulty"** sehingga webhook tidak bisa disimpan.

Mematikan `U7BUY_VERIFY_SIGNATURE` **tidak** menolong di sini: body kosong bukan
JSON, jadi hasilnya `400`, tetap gagal. Karena itu POST berbadan kosong dibalas
`{"status":"OK"}` sebagai jalur tersendiri — tanpa mencatat apa pun dan tanpa
mengubah keadaan. Webhook sungguhan selalu berisi JSON dan tetap wajib
bertanda tangan sah.

---

## Dua hal yang belum pasti dari dokumentasi

**1. Nama header tanda tangan.** Dokumentasi U7Buy tidak menyebutkannya, dan uji
koneksi tidak mengirim satu pun header tanda tangan — jadi namanya baru akan
ketahuan saat webhook order sungguhan pertama tiba. Default kita `x-signature`,
bisa diubah lewat `U7BUY_SIGNATURE_HEADER`.

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
