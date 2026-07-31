# Audit Pra-Deploy VPS — Sabar Hub

Temuan dari review kode + pengujian nyata pada 30 Juli 2026.
Diurutkan dari yang paling menghalangi deploy.

Legenda: **[UJI]** = dibuktikan dengan tes · **[KODE]** = dari pembacaan kode

> **Status 31 Juli 2026** — semua BLOCKER (#1–#5) sudah **DIPERBAIKI**.
> Yang tersisa hanya kategori 🟠 SERIUS dan 🟡 PENTING di bawah.

---

## ✅ SUDAH DIPERBAIKI

### 1. ~~Tidak ada autentikasi~~ → SELESAI
Backend kini menuntut `X-Admin-Key` pada `GET /bots`, `/orders`, `/items`,
`POST /orders`, dan seluruh endpoint channels. Dashboard di balik halaman login
(cookie httpOnly bertanda-tangan HMAC, middleware Next.js).

**[UJI]** Tanpa admin key → 401. Tanpa sesi → `/dashboard` redirect ke `/login`,
proxy balas `{"error":"unauthorized"}` 401.

### 2. ~~Registration key bocor ke browser~~ → SELESAI
`NEXT_PUBLIC_REGISTRATION_KEY` dihapus. Semua panggilan dashboard lewat
proxy server-side `/api/backend/[...path]` yang menyuntikkan kunci di server.

**[UJI]** Pencarian `dev-admin-key`, `dev-registration-key`, `changeme`,
`dev-session-secret` di seluruh bundle browser (`.next/static`): **0 kecocokan**.

### 5. ~~CORS terkunci ke localhost~~ → SELESAI
Sekarang dari env: `CORS_ORIGINS` (dipisah koma).

---

### 3. ~~Registration key di script bot publik~~ → SELESAI
Script tidak lagi memuat kunci apa pun. Token kini di-set operator sebelum loader:
```lua
getgenv().BOT_TOKEN = "sbr_bot_xxxxx"
loadstring(...)()
```
Pendaftaran otomatis dihapus — hanya admin yang bisa membuat bot (lewat dashboard,
kuncinya server-side). Script aman dipublikasikan.

**[UJI]** `grep REGISTRATION_KEY` pada script → 0 kecocokan. Bot raynorstore45
berhasil online memakai token saja, tanpa langkah registrasi.

### 4. ~~Bot palsu bisa "menyelesaikan" order~~ → SELESAI
Karena hanya admin yang bisa membuat bot (#3), penyerang luar tak punya jalan
mendaftarkan bot palsu.

Ditambah **pencabutan token**: `DELETE /api/v1/bots/{id}` (butuh admin key) +
tombol "Cabut token & hapus bot" di dashboard. Kalau satu token bocor, matikan
bot itu saja tanpa mengganggu yang lain.

**[UJI]** Cabut tanpa admin key → 401; dengan admin key → 204; token lama
setelah dicabut → 401. Ada test otomatisnya (`test_revoked_bot_token_is_rejected`).

*Sisa risiko:* bot dengan token sah tetap dipercaya laporannya. Kalau token bocor,
pemegangnya bisa melapor `fulfilled` palsu sampai kamu mencabutnya. Verifikasi silang
(bandingkan penurunan stok dengan snapshot heartbeat) bisa ditambahkan nanti.

### 4b. ~~Kunci default masih nilai contoh~~ → SELESAI
Semua kunci diganti nilai acak (`secrets.token_urlsafe`): admin key, registration key,
session secret, password dashboard. Disimpan di `.env` / `.env.local` yang **gitignored**;
`.env.example` berisi placeholder saja.

**[UJI]** Kunci lama (`dev-admin-key`, `dev-registration-key`) → 401.
Password lama (`changeme`) → 401. Kunci & password baru → 200. Proxy dashboard jalan.

---

## 🟠 SERIUS — akan menggigit saat dipakai sungguhan

### 6. Autentikasi bot O(n) — TERUKUR 0,48 detik dengan 10 bot
**[UJI]** Pengukuran nyata:

| Request | Waktu |
|---|---|
| `POST /bots/heartbeat` (ber-auth) | **0,48 – 0,57 detik** |
| `GET /bots` (tanpa auth) | 0,0034 detik |

Selisihnya ~140×. Penyebabnya di `resolve_bot()`:
```python
repo.find_by_token_candidates()  # muat SEMUA bot
... if verify_token(token, stored)  # argon2 satu per satu
```
Argon2 sengaja lambat (~50 ms). Dengan N bot, tiap request ber-auth melakukan
sampai N verifikasi.

Proyeksi: 10 bot = 0,5 dtk · **50 bot ≈ 2,5 dtk per request**.
Tiap bot claim tiap 5 detik + heartbeat tiap 15 detik → dengan 50 bot itu
~12 request/detik yang masing-masing makan 2,5 detik CPU. VPS kecil tidak akan sanggup.

**Perbaikan:** simpan prefix token (mis. 12 karakter pertama) di kolom ber-index,
cari baris yang cocok dulu, lalu argon2 **sekali saja**.

---

### 7. Claim rawan balapan (read-then-write tanpa lock)
**[KODE]** Pola di `claim_order()`: `SELECT pending → cek stok → UPDATE`,
tanpa transaksi atau penguncian baris.

**[UJI]** Aku uji 10 ronde × 5 bot claim bersamaan: **tidak pernah terjadi
double-claim**. Jadi saat ini praktiknya aman — kemungkinan karena kunci tulis
SQLite dan latensi argon2 (#6) tanpa sengaja menyerialkan permintaan.

Tapi jangan andalkan itu. Begitu kamu pindah ke PostgreSQL, atau menjalankan
uvicorn dengan `--workers > 1`, penyerialan tak sengaja itu hilang dan dua bot
bisa mengklaim order yang sama → **barang terkirim dobel**.

**Perbaikan:** `SELECT ... FOR UPDATE SKIP LOCKED` (Postgres), atau UPDATE bersyarat
(`UPDATE ... WHERE id=? AND status='pending'` lalu cek rowcount).

---

### 8. Order bisa menggantung selamanya
**[UJI]** Saat audit masih ada 2 order `pending` yang tak akan pernah diproses:
- `ae08566f` → `trowels/trowel` (huruf kecil, tak cocok katalog)
- `2fdfcae7` → `Gears/Trowel` (kategori tak ada)

Tidak ada mekanisme timeout. `mock-server.js` lama punya *backorder sweeper*,
tapi belum dipindahkan ke FastAPI.

**Perbaikan:** tugas periodik — order `pending` yang lewat batas waktu dan tak ada
bot online ber-stok → tandai `failed` dengan alasan jelas.

*Catatan: form dropdown yang baru sudah mencegah penyebab salah-ketik ini terulang.*

---

### 9. SQLite untuk beban tulis bersamaan
**[KODE]** Satu penulis pada satu waktu. Dengan banyak bot heartbeat + claim +
dashboard polling, ini jadi leher botol dan sumber `database is locked`.

**Perbaikan:** PostgreSQL di VPS. (Sekalian memungkinkan perbaikan #7.)

---

## 🟡 PENTING — rapikan sebelum atau tepat setelah deploy

### 10. Tidak ada sistem migrasi
**[KODE]** Hanya `Base.metadata.create_all()` — bisa membuat tabel baru, **tidak bisa**
mengubah tabel yang sudah ada. Aku sudah tertabrak ini saat menambah nama item, dan
terpaksa menyimpannya di dalam kolom JSON demi menghindari migrasi.

Di produksi, tiap perubahan skema jadi pekerjaan manual berisiko.

**Perbaikan:** pasang Alembic sebelum ada data produksi yang berharga.

### 11. Isolasi test rusak
**[UJI]** `pytest` gagal (1 dari 4) saat dijalankan dua kali beruntun, karena DB test
tidak direset — bot mengklaim order sisa run sebelumnya. Setelah DB dihapus: 4/4 lolos.
Kegagalannya palsu, tapi menyamarkan kegagalan asli.

**Perbaikan:** fixture yang membuat DB bersih tiap sesi test.

### 12. `datetime.utcnow()` sudah deprecated
**[UJI]** Muncul sebagai `DeprecationWarning` saat test. Akan dihapus di Python mendatang.
**Perbaikan:** `datetime.now(timezone.utc)` (sebagian sudah, sisanya belum).

### 13. Belum ada `.env.example`
Tidak ada rujukan variabel yang dibutuhkan saat deploy:
`DATABASE_URL`, `BOT_REGISTRATION_KEY`, `HEARTBEAT_TIMEOUT_SECONDS`,
`ORDER_RETRY_DELAY_SECONDS`, `ORDER_MAX_RELEASE`, `CORS_ORIGINS`.

### 14. `data/` ada di .gitignore tapi dibutuhkan saat runtime
Deploy bersih akan gagal sebelum foldernya dibuat. (Aku sudah kena ini di lokal.)

### 15. Belum ada rate limiting
`POST /orders` dan `POST /bots` bisa dibanjiri. Tanpa auth (#1, #2), ini gampang disalahgunakan.

### 16. Polling boros
Tiap tab dashboard menembak 2–3 endpoint tiap 3–5 detik, tanpa henti. Cukup untuk satu
pengguna; boros kalau banyak tab/pengguna. Pertimbangkan SSE/WebSocket nanti.

### 17. Belum ada TLS / reverse proxy / service manager
Perlu nginx atau Caddy (TLS otomatis) + systemd agar backend hidup lagi setelah reboot.

---

## Yang sudah baik dan tidak perlu diubah

- **Verifikasi kirim berbasis inventory** — order hanya `done` kalau barang benar-benar
  keluar dari tas bot. Ini menahan laporan sukses palsu dari sisi game, dan sudah
  terbukti menangkap penolakan nyata (tutorial belum selesai, cooldown).
- **Routing berbasis stok** — bot tanpa stok dilewati, bukan trial-and-error.
- **Auto-split >20 item + cooldown** — sudah sesuai batas game, teruji.
- **Token bot disimpan sebagai hash argon2** — benar (masalahnya hanya cara pencariannya, #6).
- **Arsitektur domain/infra/api** — rapi dan enak dikembangkan.

---

## Urutan pengerjaan yang kusarankan

**Sebelum VPS menyentuh internet:**
1. ~~CORS dari env (#5)~~ ✅
2. ~~Keluarkan kunci dari browser (#2)~~ ✅
3. ~~Auth admin untuk dashboard + endpoint baca (#1)~~ ✅
4. ~~Keluarkan registration key dari script publik (#3, #4)~~ ✅
5. ~~Ganti semua kunci default (#4b)~~ ✅ — **semua blocker deploy sudah beres**

**Sebelum menerima pembeli sungguhan:**
5. Perbaiki auth bot O(n) (#6) — ini sudah lambat di 10 bot
6. Backorder sweeper (#8)
7. PostgreSQL + claim aman balapan (#7, #9)
8. Alembic (#10)

**Kebersihan:**
9. `.env.example` (#13), buat `data/` saat deploy (#14), isolasi test (#11),
   rate limit (#15), TLS + systemd (#17)
