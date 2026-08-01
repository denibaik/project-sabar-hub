# Sabar Hub — Status Proyek & Panduan Lanjut

Sistem auto-send marketplace untuk Grow a Garden 2.
Terakhir diperbarui: **31 Juli 2026**. Berjalan di produksi:
`dash.sabarhub.me` (dashboard) · `api.sabarhub.me` (backend).

---

## 1. Workflow end-to-end

```
[Pembeli]
   │  order (username tujuan + item + qty)
   ▼
[Marketplace channel]
   ├── Email VCGamers ──► Apps Script ──► Google Sheet ──┐   (tiap 5 mnt / 2 mnt)
   ├── Google Sheet (CSV published) ─────────────────────┤
   ├── Webhook U7Buy ──► event tersimpan ──► pemroses ───┤   (tiap 60 dtk)
   └── Dashboard (manual) ───────────────────────────────┘
   │
   ▼
[Backend FastAPI]  ──►  antrean order (pending) + routing berbasis stok
   ▲                         │  bot polling (Bearer token)
   │ lapor hasil             ▼
[Bot in-game (executor)]  RaynorHubBot.lua
   1. claim order (hanya yang stoknya ada di bot ini)
   2. verifikasi username penerima
   3. cek stok + SendBatch (gift) — pecah otomatis kalau >20 item
   4. verifikasi inventory turun → lapor done/partial/failed
   ▼
[Dashboard Next.js]  ── di balik login; semua panggilan lewat proxy server-side
```

**Prinsip inti:** verifikasi berbasis inventory — order hanya `done` kalau item
benar-benar keluar dari tas bot, bukan sekadar "request terkirim".

**Prinsip kedua:** yang tidak bisa dipastikan tidak ditebak. Produk yang belum
dipetakan, nama yang cocok dengan lebih dari satu item, order dari game lain —
semuanya ditandai beserta alasannya, tidak diproses asal jalan. Mengirim barang
yang salah lebih merugikan daripada order yang tertunda.

**Prinsip ketiga:** tindakan yang mengubah keadaan di luar sistem kita
(`start_deliery`, `complete_deliery`, menulis stok listing) **mati secara
default** dan harus dinyalakan sadar-sadar lewat `.env`.

---

## 2. Menjalankan (3 proses)

```bash
# 1. Backend
cd raynor-hub-backend && ./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000

# 2. Frontend
cd raynor-hub-frontend && npm run dev

# 3. Bot: di executor, pada akun yang sudah SELESAI TUTORIAL & punya stok
```

**Login dashboard:** produksi `https://dash.sabarhub.me`, lokal
`http://localhost:3000` → password di `raynor-hub-frontend/.env.local`
(`DASHBOARD_PASSWORD`). Nilai lokal dan VPS **berbeda**.

**Menjalankan bot:**
1. Dashboard → **Bot Network** → **Register Bot** → salin perintah yang muncul
2. Tempel di executor:
```lua
getgenv().BOT_TOKEN = "sbr_bot_xxxxx"
local u="https://api.sabarhub.me/files/loader.lua";local ok,s=pcall(function() return game:HttpGet(u) end);if not ok then s=(request or http_request or (syn and syn.request))({Url=u,Method="GET"}).Body end;(loadstring or load)(s)()
```
Run berikutnya di akun yang sama tak perlu `BOT_TOKEN` lagi — **kecuali** kalau
executor-nya tak bisa menyimpan berkas. Script menyebutkannya saat menyala:
`executor=… · simpan token=ya/TIDAK`.

`BASE_URL` di script diisi backend dari `PUBLIC_API_URL` saat disajikan lewat
`/files/loader.lua`, jadi jangan mengedit `RaynorHubBot.lua` di server — file itu
ter-track git dan editannya membuat `git pull` bentrok.

---

## 3. Status per fitur

### ✅ Selesai & teruji
- **Backend Bots** — register (admin-only), heartbeat + inventory + nama item, list,
  **cabut token** (`DELETE /api/v1/bots/{id}`).
- **Backend Orders** — create, list, **claim dengan routing berbasis stok**,
  result (fulfilled/partial/failed/released + cooldown retry + max_release→failed).
- **Backend Items** — `GET /api/v1/items` agregasi stok semua bot online, dengan
  `display_name` ramah (mis. "Golden Dragonfly", bukan UUID).
- **Backend Channels** — CRUD + **Google Sheet sync** (baca CSV published → bikin order,
  dedup via `order_ref`) — **UI sudah tersambung & teruji**.
- **Bot** — token-based (tanpa kunci di script), heartbeat, claim, verifikasi penerima,
  cek stok, SendBatch, verifikasi inventory, multi-item 1 order, auto-split >20 item
  dengan cooldown, single-instance guard.
- **Kirim gift sungguhan** — terbukti end-to-end.
- **Dashboard** — Bots, Orders (form dropdown ber-stok), Inventory, Products, Dashboard.
  Semua data nyata, polling 3–5 detik.
- **Auth bot cepat** — lookup token via prefix ber-index: 0,08 dtk pada 32 bot (dari 0,48 dtk pada 10 bot), latensi datar.
- **Backorder sweeper** — order pending tak terpenuhi otomatis `failed` + endpoint sweep manual.
- **Rate limiting** — per IP, tiga kelompok batas (publik/bot/admin), bisa diatur via env.
- **Keamanan** — login dashboard (cookie httpOnly HMAC), semua endpoint kelola butuh
  `X-Admin-Key`, kunci hanya server-side (0 kebocoran ke browser), CORS dari env,
  kunci acak kuat, pencabutan token bot.
- **Sidebar Marketplace** — 7 channel + Setup (How to Use, Bot Script).
- **Pencocokan stok toleran ejaan** — `seeds`/`Seeds`, `Dragon Breath`/`Dragon's Breath`,
  `Strawberry Seed`/`Strawberry` semuanya cocok. Kecocokan yang ambigu **ditolak**,
  tidak ditebak. Order yang diserahkan ke bot dibakukan ke ejaan katalog.
- **VCGamers lewat email** — `gmail-to-sheet.gs`: Apps Script membaca notifikasi
  Gmail, menulis ke sheet. 25 produk terpetakan (kategori diverifikasi ke data game).
  `mulaiDariSekarang` menandai email lama; `prosesEmailBaru` menolak jalan tanpa itu.
- **U7Buy tahap 1–3** — webhook (verifikasi tanda tangan + dedup + balas <5 dtk),
  pemroses event → order, klien API, halaman dashboard dengan tombol tarik listing.
  Callback yang mengubah order pembeli **mati secara default**.
- **Anti-AFK bot** — game memanggil `RequestHop` setelah 19 menit diam, yang
  mematikan script. Ditangkal lewat atribut `AntiAfkIdleOverride` (lokal).
- **Kompatibilitas executor** — rantai HTTP mencakup `request`/`http_request`/
  `syn`/`fluxus`; loader memakai `(loadstring or load)`; script menyebutkan nama
  executor & apakah token bisa disimpan.
- **Penjaga database** — backend menyebutkan database yang dibuka saat menyala,
  dan berterus terang bila jatuh ke nilai bawaan.
- **Alembic** — skema diurus migrasi, dijalankan otomatis saat backend menyala.
  Database yang sudah ada sebelum Alembic dipasang **diadopsi** (stamp), bukan
  dibangun ulang — datanya tidak disentuh. Migrasi baru:
  `.venv/bin/python -m alembic revision --autogenerate -m "ubah apa"`.
- **Perbandingan stok listing** — `/api/v1/u7buy/stock-plan` membandingkan angka
  stok di listing U7Buy dengan stok bot yang sesungguhnya
  (`stok bot ÷ per_unit`, dibulatkan ke bawah). Hanya membaca. Penulisannya ada
  tapi **mati secara default** (`U7BUY_STOCK_SYNC_ENABLED`).

**70 test otomatis**, seluruhnya lolos. Panggilan jaringan ke marketplace selalu
digantikan tiruan — tidak ada test yang menyentuh order pembeli sungguhan.

### 🐛 Celah yang diketahui, belum ditambal

**Order `processing` bisa nyangkut selamanya.** Kalau bot selesai mengirim lalu
laporan hasilnya gagal sampai ke backend (mis. backend sedang restart), bot tidak
mencoba ulang, dan sweeper hanya menangani order `pending` — order itu berhenti di
`processing` tanpa ada yang membereskannya.

Penanggulangan sementara: sebelum me-restart backend, pastikan tidak ada order
berstatus `processing` di dashboard. Antrean biasanya kosong, jadi ini mudah.

**Keputusan (31 Juli): dibiarkan, ditangani manual.** Volume order masih kecil dan
order nyangkut mudah dibereskan lewat dashboard. Kalau nanti sering terjadi,
perbaikannya: bot mencoba ulang laporannya beberapa kali, dan sweeper melepas
order `processing` yang bot-nya sudah lama tak mengirim heartbeat.

### 🚧 Belum
- **Tanda tangan webhook U7Buy belum terverifikasi.** Dokumentasi mereka tidak
  memuat contoh, dan tombol "Check" di portal mengirim POST kosong **tanpa**
  tanda tangan — jadi formatnya baru ketahuan saat order asli pertama tiba.
  Saat gagal, log menampilkan seluruh header + semua kandidat yang dihitung.
- **`U7BUY_CALLBACK_ENABLED` masih `false`.** Sengaja: menyalakannya membuat
  sistem menandai order pembeli selesai di marketplace, dan itu tak bisa dibatalkan.
  Nyalakan setelah satu order uji terbukti benar ujung ke ujung.
- **Form koneksi channel lain** — `/marketplace/[slug]` masih placeholder
  (Google Sheet dan U7Buy sudah punya halaman sendiri).
- **Integrasi API marketplace lain** — butuh kredensial Itemku/G2G/Eldorado.
- **Web store publik** & landing page di `sabarhub.me`.
- Halaman AI Control Center masih mock.

### ⚠️ Ketimpangan stok yang perlu diberesi
Angka stok di listing marketplace adalah yang **kamu ketik**, bukan yang benar-benar
dipegang bot. Per 31 Juli, yang paling menganga:

| Listing | Tertulis | Stok bot |
|---|---|---|
| Ghost Pepper (U7Buy, terjual 55×) | 18 | **0** |
| Rainbow Seed (U7Buy, terjual 358×) | 100 | 2 |
| Gold Seed | 100 | 1 |

Selama ini belum diberesi, ordernya akan gagal `no_bot_has_stock` begitu masuk —
kini beserta nama item dan stok terbanyak yang ditemukan.

Detail lengkap + prioritas: lihat **PRE_DEPLOY_AUDIT.md**.
Panduan deploy VPS: lihat **DEPLOY_DIGITALOCEAN.md**.

---

## 4. Hal penting yang mudah terlupa

- **Tutorial wajib selesai** di tiap akun bot — kalau belum, server menolak gifting.
- **Cooldown ~8 detik** antar gift; bot memakai jeda 10 detik.
- **Maks 20 item** distinct per SendBatch — order lebih besar dipecah otomatis.
- **Nama item tak perlu persis lagi**, tapi tetap harus item yang benar-benar ada.
  Kategori asli: `Seeds`, `Trowels`, `WateringCans`, `Sprinklers`, `Pets`,
  **`Raccoons`** (terpisah dari `Pets`!), `SeedPacks`, `HarvestedFruits`, dst.
- **`Seeds` adalah kategori bernama ketat di game.** `"Ghost Pepper Seed"` ditolak,
  `"Ghost Pepper"` diterima — bukan soal kerapian, kirimannya benar-benar gagal.
- **`.env` HARUS berakhir baris kosong.** Tanpa itu, teks yang ditempel berikutnya
  menempel ke baris terakhir. Ini pernah menelan `DATABASE_URL` sehingga backend
  diam-diam pindah ke SQLite kosong dan seluruh data seolah lenyap selama berjam-jam.
  Periksa dengan `tail -c 1 .env | xxd` (harus `0a`) dan `cut -d= -f1 .env`
  (satu nama setelan per baris, tanpa duplikat).
- **`per_unit` pada U7Buy bukan opsional** — judul listing menanam jumlahnya
  ("150x Trowel"). Salah mengisinya membuat pembeli menerima 1 dari 150.
- **Saring `gameName`** — 209 dari 221 listing U7Buy adalah game lain.
- **Stok harus sah di server** — item hasil inject client-side ditolak saat kirim.
- **Kunci frontend & backend harus sama persis** (`ADMIN_API_KEY`, `BOT_REGISTRATION_KEY`).
- Jangan pernah pakai `NEXT_PUBLIC_` untuk secret — ikut ter-bundle ke browser.

---

## 5. Prompt untuk melanjutkan

| Mau lanjut apa | Prompt |
|---|---|
| Cocokkan tanda tangan U7Buy | *"Ini log webhook U7Buy pertama, cocokkan rumus tanda tangannya"* (sertakan log) |
| Tambal order nyangkut | *"Bot coba ulang laporan hasil; sweeper lepas order processing yang botnya offline"* |
| Web store publik | *"Buat halaman web store publik untuk pembeli"* |
| Landing page | *"Buat landing page di sabarhub.me"* |
| Form koneksi channel lain | *"Sambungkan form /marketplace/[slug] ke CRUD channels"* |
| Integrasi marketplace lain | *"Integrasi API Itemku untuk tarik order otomatis"* (siapkan kredensial) |

---

## 6. Endpoint backend

```
GET  /health                                          publik
GET  /files/loader.lua                                publik (script bot, tanpa kunci)

POST /api/v1/bots                 X-Registration-Key  daftarkan bot (dipakai dashboard)
DELETE /api/v1/bots/{id}          X-Admin-Key         cabut token & hapus bot
GET  /api/v1/bots                 X-Admin-Key         list bot
POST /api/v1/bots/heartbeat       Bearer              heartbeat + inventory + names
POST /api/v1/bots/claim           Bearer              ambil order (routing stok)
POST /api/v1/bots/result          Bearer              lapor hasil

POST /api/v1/orders               X-Admin-Key         buat order
GET  /api/v1/orders               X-Admin-Key         list order
GET  /api/v1/items                X-Admin-Key         stok agregat + display_name

GET/POST /api/v1/channels         X-Admin-Key         kelola channel
PATCH/DELETE /api/v1/channels/{id} X-Admin-Key
POST /api/v1/channels/{id}/sync   X-Admin-Key         Google Sheet → order

POST /api/v1/webhooks/u7buy       tanda tangan        notifikasi U7Buy (body kosong = uji koneksi)
GET  /api/v1/webhooks/events      X-Admin-Key         riwayat webhook + nasibnya
GET  /api/v1/u7buy/offers         X-Admin-Key         listing U7Buy + usulan pemetaan
GET  /api/v1/u7buy/stock-plan     X-Admin-Key         stok listing vs stok bot (baca saja)
POST /api/v1/u7buy/stock-sync     X-Admin-Key         tulis stok ke listing (ditolak bila mati)
POST /api/v1/orders/sweep         X-Admin-Key         sapu order kedaluwarsa
```
Docs interaktif: `http://127.0.0.1:8000/docs`

---

## 7. File kunci
- Backend: `raynor-hub-backend/app/main.py`, config di `app/core/config.py`
- Bot: `raynor-hub-frontend/public/RaynorHubBot.lua` (disajikan `/files/loader.lua`)
- Frontend API client: `raynor-hub-frontend/src/lib/api/backend.ts`
- Proxy ber-auth: `raynor-hub-frontend/src/app/api/backend/[...path]/route.ts`
- Auth sesi: `raynor-hub-frontend/src/lib/auth.ts`, `src/middleware.ts`
- U7Buy: `app/infrastructure/marketplaces/u7buy_client.py` (klien API),
  `u7buy_catalog.py` (usulan pemetaan), `scripts/u7buy_products.py` (daftar listing)
- VCGamers: `gmail-to-sheet.gs` (tempel ke Apps Script — TIDAK ikut `git pull`)
- Env: `.env.example` di kedua folder (yang asli `.env` / `.env.local`, gitignored)
