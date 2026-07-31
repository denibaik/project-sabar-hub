# Sabar Hub — Status Proyek & Panduan Lanjut

Sistem auto-send marketplace untuk Grow a Garden.
Terakhir diperbarui: **31 Juli 2026**.

---

## 1. Workflow end-to-end

```
[Pembeli]
   │  order (username tujuan + item + qty)
   ▼
[Marketplace channel]  ── Itemku / G2G / Eldorado / U7Buy / VCGamers / Web Store / Google Sheet
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

---

## 2. Menjalankan (3 proses)

```bash
# 1. Backend
cd raynor-hub-backend && ./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000

# 2. Frontend
cd raynor-hub-frontend && npm run dev

# 3. Bot: di executor, pada akun yang sudah SELESAI TUTORIAL & punya stok
```

**Login dashboard:** `http://localhost:3000` → password ada di
`raynor-hub-frontend/.env.local` (`DASHBOARD_PASSWORD`).

**Menjalankan bot:**
1. Dashboard → **Bot Network** → **Register Bot** → salin perintah yang muncul
2. Tempel di executor:
```lua
getgenv().BOT_TOKEN = "sbr_bot_xxxxx"
local u="http://127.0.0.1:8000/files/loader.lua";local ok,s=pcall(function() return game:HttpGet(u) end);loadstring(ok and s or (request or http_request)({Url=u,Method="GET"}).Body)()
```
Run berikutnya di akun yang sama tak perlu `BOT_TOKEN` lagi (tersimpan otomatis).

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
- **Keamanan** — login dashboard (cookie httpOnly HMAC), semua endpoint kelola butuh
  `X-Admin-Key`, kunci hanya server-side (0 kebocoran ke browser), CORS dari env,
  kunci acak kuat, pencabutan token bot.
- **Sidebar Marketplace** — 7 channel + Setup (How to Use, Bot Script).

### 🚧 Belum
- **Form koneksi channel** — halaman `/marketplace/[slug]` masih UI placeholder.

- **Integrasi API marketplace asli** — butuh kredensial Itemku/G2G/dll.
- **Web store publik** — halaman pembeli belum dibuat.
- **Backorder sweeper** — order tanpa bot ber-stok menggantung `pending` selamanya.
- **Auth bot O(n)** — terukur 0,48 dtk pada 10 bot; perlu lookup by token-prefix.
- **PostgreSQL + claim aman balapan**, **Alembic**, **rate limiting**, **TLS/systemd**.
- Halaman `/` (index lama) & AI Control Center masih mock.

Detail lengkap + prioritas: lihat **PRE_DEPLOY_AUDIT.md**.

---

## 4. Hal penting yang mudah terlupa

- **Tutorial wajib selesai** di tiap akun bot — kalau belum, server menolak gifting.
- **Cooldown ~8 detik** antar gift; bot memakai jeda 10 detik.
- **Maks 20 item** distinct per SendBatch — order lebih besar dipecah otomatis.
- **category & item_key case-sensitive** — form dashboard sudah pakai dropdown, jadi
  tak bisa salah ketik lagi. Kalau bikin order lewat API, tulis persis:
  `Seeds`, `Trowels`, `WateringCans`, `Sprinklers`, `Pets`, `HarvestedFruits`, dst.
- **Stok harus sah di server** — item hasil inject client-side ditolak saat kirim.
- **Kunci frontend & backend harus sama persis** (`ADMIN_API_KEY`, `BOT_REGISTRATION_KEY`).
- Jangan pernah pakai `NEXT_PUBLIC_` untuk secret — ikut ter-bundle ke browser.

---

## 5. Prompt untuk melanjutkan

| Mau lanjut apa | Prompt |
|---|---|
| Web store publik | *"Buat halaman web store publik untuk pembeli"* |
| Form koneksi channel lain | *"Sambungkan form /marketplace/[slug] ke CRUD channels"* |
| Backorder sweeper | *"Tambah backorder sweeper: order pending tanpa bot ber-stok → failed setelah timeout"* |
| Perbaiki auth O(n) | *"Percepat resolve_bot: lookup token pakai prefix ber-index, argon2 sekali saja"* |
| PostgreSQL + Alembic | *"Pindahkan backend ke PostgreSQL dan pasang Alembic"* |
| Claim aman balapan | *"Amankan claim dari race: SELECT FOR UPDATE SKIP LOCKED / UPDATE bersyarat"* |
| Integrasi marketplace | *"Integrasi API Itemku untuk tarik order otomatis"* (siapkan kredensial) |
| Deploy VPS | *"Bantu deploy ke VPS: nginx + TLS + systemd + PostgreSQL"* |

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
```
Docs interaktif: `http://127.0.0.1:8000/docs`

---

## 7. File kunci
- Backend: `raynor-hub-backend/app/main.py`, config di `app/core/config.py`
- Bot: `raynor-hub-frontend/public/RaynorHubBot.lua` (disajikan `/files/loader.lua`)
- Frontend API client: `raynor-hub-frontend/src/lib/api/backend.ts`
- Proxy ber-auth: `raynor-hub-frontend/src/app/api/backend/[...path]/route.ts`
- Auth sesi: `raynor-hub-frontend/src/lib/auth.ts`, `src/middleware.ts`
- Env: `.env.example` di kedua folder (yang asli `.env` / `.env.local`, gitignored)
