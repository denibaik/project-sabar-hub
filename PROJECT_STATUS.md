# Sabar Hub — Status Proyek & Panduan Lanjut

Dokumen ini merangkum **sudah sampai mana** proyek Sabar Hub (sistem auto-send
marketplace untuk Grow a Garden) dan **prompt apa** yang bisa kamu pakai untuk
melanjutkan tiap bagian.

---

## 1. Workflow end-to-end (gambaran besar)

```
[Pembeli]
   │  order (username tujuan + item + qty)
   ▼
[Marketplace channel]  ── Itemku / G2G / Eldorado / U7Buy / VCGamers / Web Store / Google Sheet
   │  order masuk ke backend
   ▼
[Backend FastAPI]  ──►  antrean order (pending) + routing berbasis stok
   ▲                         │  bot polling
   │ lapor hasil             ▼
[Bot in-game (executor)]  RaynorHubBot.lua di akun Roblox
   1. claim order (hanya yang stoknya ada)
   2. verifikasi username penerima
   3. cek stok + SendBatch (gift) — pecah otomatis kalau >20 item
   4. verifikasi inventory turun → lapor done/partial/failed
   ▼
[Dashboard Next.js]  ──  pantau bots, orders, inventory, products (real-time)
```

Prinsip inti: **verifikasi berbasis inventory** — order dianggap `done` hanya kalau
item benar-benar keluar dari tas bot (bukan sekadar "request terkirim").

---

## 2. Komponen & lokasi

| Komponen | Stack | Lokasi | Jalan di |
|---|---|---|---|
| Backend | FastAPI (Python) | `raynor-hub-backend/` | `http://127.0.0.1:8000` |
| Bot | Lua (executor) | `../marketplace/RaynorHubBot.lua` | di dalam game, per akun |
| Frontend | Next.js | `raynor-hub-frontend/` | `http://localhost:3000` |

### Cara menjalankan (3 proses)
```bash
# 1. Backend
cd raynor-hub-backend && ./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000 --reload

# 2. Frontend
cd raynor-hub-frontend && npm run dev

# 3. Bot: jalankan RaynorHubBot.lua di executor, di akun Roblox yang sudah:
#    - selesai TUTORIAL game (gifting diblokir selama tutorial!)
#    - punya stok item
```

---

## 3. Status per fitur

### ✅ SELESAI & TERBUKTI
- **Backend — Bots**: register (`X-Registration-Key` → token), heartbeat + inventory (Bearer), list. Bot muncul online.
- **Backend — Orders**: create, list, **claim (routing berbasis stok)**, result (fulfilled/partial/failed/released + retry cooldown + max_release→failed).
- **Backend — Items**: `GET /api/v1/items` agregasi stok semua bot online.
- **Backend — Channels**: CRUD channel + **Google Sheet sync fungsional** (baca CSV published → bikin order, dedup via `order_ref`). *Endpoint siap, form UI belum disambung.*
- **Bot (RaynorHubBot.lua)**: register→heartbeat→claim→verifikasi penerima→cek stok→SendBatch→verifikasi inventory→result. Auto BOT_ID per akun. **Multi-item 1 order** + **auto-split >20 item** dengan cooldown ~10s.
- **Kirim gift SUNGGUHAN**: terbukti (Strawberry, multi-item) ke raynorqt, terverifikasi inventory turun.
- **Frontend wired ke backend (data nyata, polling)**: Dashboard (KPI + order terbaru + status bot), Orders (list + form New Order), Inventory (stok agregat), Products (katalog), Bots (register + heartbeat live).
- **Sidebar Marketplace**: section dengan Itemku, G2G, Eldorado, U7Buy, VCGamers, Web Store, Google Sheet, Setup. Tiap channel punya halaman (UI placeholder, badge "Belum terhubung").

### 🚧 BELUM / MENYUSUL
- **Form koneksi channel** — halaman `/marketplace/[slug]` masih UI disabled. Backend channel API sudah siap, tinggal wiring form.
- **Integrasi API marketplace asli** (Itemku/G2G/Eldorado/U7Buy/VCGamers tarik order otomatis) — butuh kredensial API asli mereka. Belum dibangun.
- **Google Sheet sync UI** — logika backend jalan, tapi belum ada tombol "Sync" di dashboard + belum ada scheduler (baru manual via API).
- **Web store publik** — halaman pembeli (pilih produk → checkout → `POST /api/v1/orders`). Belum dibuat.
- **Backorder sweeper di backend** — order yang TAK ADA bot ber-stok saat ini akan menggantung `pending` selamanya (belum ada timeout→failed). *Catatan: ada di mock-server.js lama, belum diport ke FastAPI.*
- **Halaman `/` (index lama) & AI Control Center** — masih mock, belum di-wire.
- **Keamanan produksi** — `NEXT_PUBLIC_REGISTRATION_KEY` terekspos ke client (OK untuk dev, produksi harus proxy lewat server). Auth bot pakai Bearer token (sudah hashed di DB).

### ⚠️ Hal penting yang dipelajari (jangan lupa)
- **Tutorial wajib selesai** di tiap akun bot sebelum bisa gifting (`"You can't gift items during the tutorial!"`).
- **Cooldown ~8 detik** antar gift → `ORDER_GAP=10`, `GIFT_COOLDOWN=10` di bot.
- **Batas 20 item** distinct per SendBatch → bot auto-split.
- **Stok harus sah di server** — item hasil inject client-side bisa ditolak server.
- Belum di-commit/push ke GitHub (ini clone lokal). Saran: tambah `data/`, `.venv/`, `.env.local`, `node_modules/` ke `.gitignore`.

---

## 4. Prompt untuk melanjutkan (tinggal salin)

| Mau lanjut apa | Prompt yang bisa dipakai |
|---|---|
| Sambungkan form Google Sheet | *"Wire form halaman /marketplace/google-sheet ke endpoint channels + sync di backend, biar bisa masukin CSV URL dan klik Sync"* |
| Sambungkan Web Store | *"Wire form /marketplace/webstore: buat channel webstore + tampilkan webhook URL untuk terima order"* |
| Web store publik untuk pembeli | *"Buat halaman web store publik: pembeli pilih produk dari katalog, isi username, checkout → bikin order"* |
| Backorder sweeper | *"Tambah backorder sweeper di backend FastAPI: order pending yang tak ada bot ber-stok online → failed setelah timeout"* |
| Integrasi marketplace asli | *"Integrasi API Itemku untuk tarik order berbayar otomatis jadi order di backend"* (siapkan kredensial API) |
| Wire form semua channel | *"Wire semua form /marketplace/[slug] ke CRUD channels: add, enable/disable, simpan config, hapus"* |
| Tampilkan stok per bot di dashboard | *"Tambah kolom inventory count di list bot + halaman detail stok per bot"* |
| Commit & push | *"Rapikan .gitignore lalu bantu commit perubahan ke branch baru"* |

---

## 5. Endpoint backend (referensi cepat)

```
GET  /health
POST /api/v1/bots                 (X-Registration-Key)      register bot
POST /api/v1/bots/heartbeat       (Bearer)                  heartbeat + inventory
GET  /api/v1/bots                                           list bots
POST /api/v1/bots/claim           (Bearer)                  claim order (routing stok)
POST /api/v1/bots/result          (Bearer)                  lapor hasil
POST /api/v1/orders               (X-Registration-Key)      buat order
GET  /api/v1/orders                                         list orders
GET  /api/v1/items                                          agregasi stok bot online
GET  /api/v1/channels                                       list channel
POST /api/v1/channels             (X-Registration-Key)      buat channel
PATCH  /api/v1/channels/{id}      (X-Registration-Key)      update/enable channel
DELETE /api/v1/channels/{id}      (X-Registration-Key)      hapus channel
POST /api/v1/channels/{id}/sync   (X-Registration-Key)      Google Sheet: import order dari CSV
```
Dokumentasi interaktif: `http://127.0.0.1:8000/docs`

---

## 6. File kunci
- Backend logic: `raynor-hub-backend/app/main.py`
- Bot: `../marketplace/RaynorHubBot.lua` (di folder Downloads/marketplace)
- Frontend API client: `raynor-hub-frontend/src/lib/api/backend.ts`
- Sidebar: `raynor-hub-frontend/src/components/sidebar.tsx`
- Halaman channel: `raynor-hub-frontend/src/app/(dashboard)/marketplace/[slug]/page.tsx`
