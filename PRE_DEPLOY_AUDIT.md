# Audit Pra-Deploy VPS — Sabar Hub

Temuan dari review kode + pengujian nyata pada 30 Juli 2026.
Diurutkan dari yang paling menghalangi deploy.

Legenda: **[UJI]** = dibuktikan dengan tes · **[KODE]** = dari pembacaan kode

---

## 🔴 BLOCKER — jangan deploy publik sebelum ini beres

### 1. Tidak ada autentikasi sama sekali
**[KODE]** `GET /api/v1/bots`, `/api/v1/orders`, `/api/v1/items` terbuka tanpa auth.
Dashboard Next.js juga tanpa login.

Begitu di VPS, siapa pun yang tahu alamatnya bisa melihat seluruh bot, order,
username pembeli, dan isi stokmu. Tidak ada yang menghalangi.

**Perbaikan:** tambah auth admin (session/JWT) untuk dashboard + endpoint baca.

---

### 2. Registration key bocor ke browser
**[KODE]** `raynor-hub-frontend/.env.local` memakai `NEXT_PUBLIC_REGISTRATION_KEY`.

Semua variabel `NEXT_PUBLIC_*` **ikut ter-bundle ke JavaScript yang dikirim ke browser**.
Siapa pun cukup buka DevTools untuk mendapatkannya. Kunci itu yang melindungi:
- `POST /api/v1/orders` → **bisa menyuruh bot-mu mengirim item ke username mana pun**
- `POST /api/v1/bots` → mendaftarkan bot

Ini jalur kehilangan barang paling langsung.

**Perbaikan:** pindahkan pemanggilan ber-key ke Next.js Route Handler / Server Action
(kunci tetap di server), jangan pernah `NEXT_PUBLIC_*` untuk secret.

---

### 3. Registration key ada di script bot yang dipublikasikan
**[KODE]** `RaynorHubBot.lua` memuat `REGISTRATION_KEY = "dev-registration-key"`,
dan script itu sudah publik di GitHub + disajikan `/files/loader.lua`.

Masalahnya bukan sekadar nilai default — ini **cacat desain**: script auto-register
harus membawa kunci, dan script itu dibagikan publik, jadi kuncinya selalu ikut publik.

**Perbaikan (pilih satu):**
- **A. Pra-register di dashboard** → tanam *bot token* (per akun) di script, bukan
  registration key. Script jadi per-bot, tapi kunci pendaftaran tak pernah bocor.
- **B. Kode pendaftaran sekali pakai** — dashboard menerbitkan kode berumur pendek;
  script menukarnya jadi token permanen.

---

### 4. Bot palsu bisa "menyelesaikan" order tanpa mengirim apa pun
**[KODE]** Konsekuensi dari #3. Siapa pun yang punya registration key bisa
mendaftarkan bot palsu, mengklaim order, lalu `POST /result` dengan
`status="fulfilled"` — backend memercayainya tanpa verifikasi.

Akibatnya: pembeli tidak menerima barang, tapi sistem mencatat `done`.
Untuk marketplace berbayar, ini fatal.

**Perbaikan:** batasi bot yang boleh mendaftar (#3), dan pertimbangkan verifikasi
silang (mis. bandingkan penurunan stok yang dilaporkan bot dengan snapshot sebelumnya).

---

### 5. CORS terkunci ke localhost
**[KODE]** `app/main.py`:
```python
allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"]
```
Dashboard di VPS akan langsung gagal memanggil API.

**Perbaikan:** ambil dari env, mis. `CORS_ORIGINS=https://dashboard.domainmu.com`.

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
1. CORS dari env (#5) — kalau tidak, aplikasi langsung rusak
2. Registration key: keluarkan dari browser (#2) dan dari script publik (#3, #4)
3. Auth admin untuk dashboard + endpoint baca (#1)
4. Ganti `dev-registration-key` dengan nilai acak panjang

**Sebelum menerima pembeli sungguhan:**
5. Perbaiki auth bot O(n) (#6) — ini sudah lambat di 10 bot
6. Backorder sweeper (#8)
7. PostgreSQL + claim aman balapan (#7, #9)
8. Alembic (#10)

**Kebersihan:**
9. `.env.example` (#13), buat `data/` saat deploy (#14), isolasi test (#11),
   rate limit (#15), TLS + systemd (#17)
