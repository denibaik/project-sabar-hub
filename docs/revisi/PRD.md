# PRD Revisi: Sabar Hub

Status: Draft untuk review. Dibuat dari pembacaan kode repo (branch `main`, commit `eaaf1dc`)
dan analisis Peblet Hub (lihat PEBLET_ANALYSIS.md).

## 1. Kondisi sekarang (fakta dari repo)

**Backend** `raynor-hub-backend`: FastAPI, SQLAlchemy 2, Alembic, argon2. Semua route ada di
`app/main.py` (sekitar 1100 baris). 70 test otomatis. Model: `BotModel`, `OrderModel`,
`BotInventoryModel`, `ChannelModel`, `WebhookEventModel`.

**Frontend** `raynor-hub-frontend`: Next.js 15, React 19, Tailwind 3, Radix. Data nyata via
proxy server-side `/api/backend/[...path]`. Sudah ada komponen gaya shadcn:
avatar, badge, button, calendar, card, table, tabs.

**Fitur jalan:** bot token-based, claim order berbasis stok, verifikasi inventory, Google Sheet
sync, VCGamers via email, U7Buy webhook + stock-plan, login dashboard, rate limit.

**Belum / lemah** (dari PROJECT_STATUS.md):
- Order `processing` bisa nyangkut kalau laporan bot gagal sampai.
- Form koneksi channel selain Google Sheet dan U7Buy masih placeholder (`/marketplace/[slug]`).
- Halaman Agent Control masih mock.
- Tidak ada halaman Delivery Proof / riwayat bukti kirim.
- Itemku, G2G belum terintegrasi (butuh kredensial).
- Eldorado tidak bisa kirim otomatis (username pembeli tidak ada di API).
- UI memakai palet slate/cyan, belum monokrom, `backdrop-blur` hanya dipakai 1 kali.

## 2. Tujuan revisi

1. UI konsisten: glassmorphism monokrom dengan komponen shadcn/ui.
2. Alur dashboard mengikuti pola Peblet yang relevan: Orders, Products, Delivery Proof, Bot, Setup.
3. Menutup celah operasional yang sudah diketahui (order nyangkut).
4. Menyiapkan price automation untuk marketplace yang punya akses API.

## 3. Di luar cakupan (sengaja)

- Langganan berbayar, multi-tenant, Open API publik. Sabar Hub saat ini single-admin.
  Kalau nanti jadi SaaS, itu PRD terpisah.
- Menulis ulang backend. Revisi backend hanya penambahan, tidak mengubah kontrak yang dipakai bot.
- Mengubah `RaynorHubBot.lua` (ter-track git dan disajikan lewat `/files/loader.lua`).

## 4. Prinsip yang tidak boleh dilanggar

Diambil dari PROJECT_STATUS.md, berlaku untuk semua fitur baru:
- Verifikasi berbasis inventory: order `done` hanya bila item benar-benar keluar dari tas bot.
- Yang tidak pasti tidak ditebak. Ditandai dengan alasan, bukan diproses asal jalan.
- Aksi yang mengubah dunia luar (callback, tulis stok, tulis harga) mati secara default dan
  dinyalakan lewat `.env`.

## 5. Kebutuhan

### P0: UI (lihat UI_SPEC.md)
- F1. Design token monokrom + utilitas `.glass` di `globals.css`.
- F2. Lengkapi komponen shadcn: input, select, switch, dialog, sheet, dropdown-menu, tooltip,
  skeleton, sonner, scroll-area, separator, label, checkbox.
- F3. Restyle sidebar, top-bar, dan semua halaman dashboard memakai token baru.
- F4. Halaman Orders: filter status/sumber, detail dalam Sheet, aksi cancel (sudah ada di backend).

### P0: Operasional
- F5. Pelepas order `processing` yang bot-nya berhenti heartbeat (usulan dari PROJECT_STATUS.md):
  sweeper melepas order `processing` bila `updated_at` lebih tua dari ambang dan bot tidak
  heartbeat. Ambang lewat env. Wajib ada test.

### P1 (gap hasil perbandingan dengan Peblet, lihat PEBLET_ANALYSIS.md bagian 5)
- F6. Riwayat pengiriman (padanan `/deliveries` Peblet).
  - Backend: `GET /api/v1/deliveries` dengan paging, memakai data `OrderModel` yang sudah ada
    (status `done`/`partial`, `sent_total`, `requested_total`, `assigned_bot`, `items`, `updated_at`).
    Tanpa tabel baru.
  - Frontend: halaman `/delivery-proof` (UI_SPEC bagian 5).
  - Screenshot/video TIDAK ada karena bot sekarang tidak mengirimnya. Jangan dijanjikan di UI.
  - Test: paging, filter status, dan order tanpa bot ditugaskan.
- F7. Katalog produk dengan alias nama (padanan `/products` Peblet).
  - Masalah sekarang: pemetaan nama produk tersebar di sheet dan `u7buy_catalog.py`.
  - Usulan: tabel `products` (`id`, `name`, `per_unit`, `category`, `item_key`, `aliases` JSON)
    lewat Alembic. `per_unit` wajib diisi karena salah isi membuat pembeli menerima 1 dari 150
    (PROJECT_STATUS bagian 4).
  - Migrasi bertahap: katalog baru dibaca lebih dulu, `u7buy_catalog.py` jadi fallback.
    Jangan menghapus jalur lama sebelum test U7Buy lolos dengan katalog baru.
- F8. Form koneksi channel nyata untuk `[slug]`, mulai dari yang punya API (U7Buy sudah ada).
- F9. Price automation dan log undercut (lihat PRICE_AUTOMATION.md).
  - Tahap 1 mode lapor saja. Tabel `price_rules` dan `price_log` ada di dokumen itu.
  - Sumber harga: scraping (keputusan 3). Tinggal pilih marketplace pertama, selisih, dan interval.

### P2
- F10. Halaman laporan penjualan sederhana (padanan `sales-report`), dari data order yang ada.
- F11. Ganti halaman Agent Control yang masih mock, atau hapus dari sidebar.
- F12. Itemku dan G2G setelah kredensial dan dokumentasi API resmi tersedia.
  Path Itemku/G2G yang terlihat di bundle Peblet bukan spesifikasi dan tidak boleh dipakai sebagai acuan.
- F13. Fitur bot ala Peblet (diputuskan: ketiganya diambil). Dikerjakan terpisah, satu per satu:
  - F13a. Tag bot: pengelompokan bot dan penugasan tag. Risiko rendah. Tabel/kolom tag lewat Alembic.
  - F13b. Auto-accept friend request: bot menerima permintaan pertemanan pada interval yang diatur
    (Peblet: minimum 10 detik). Default mati, dinyalakan lewat `.env`. Log aktivitas disimpan.
  - F13c. Proxy per bot: satu proxy tetap per bot (Peblet menyematkannya agar alamat akun tidak berganti-ganti).
    Format yang didukung di Peblet: `host:port`, `host:port:user:pass`, `user:pass@host:port`.
    Kredensial proxy dienkripsi atau disimpan di `.env`, tidak boleh muncul di log maupun bundle browser.
  - Catatan risiko: F13b dan F13c berinteraksi dengan sistem anti-bot game. Itu risiko terhadap akun bot Anda
    sendiri (suspend atau ban), bukan jaminan aman. Mulai dari F13a, lalu uji F13b pada satu akun.

## 5b. Keputusan

| # | Pertanyaan | Keputusan | Catatan |
|---|---|---|---|
| 1 | Ambil F7 (katalog produk)? | **Ya**, setelah F1-F4 | Mengubah skema DB dan jalur U7Buy |
| 2 | Warna status order | **Monokrom, `failed` merah** | UI_SPEC bagian 1 |
| 3 | Sumber harga kompetitor | **Scraping halaman marketplace, seperti Peblet** | Label UI Peblet: "Scraping Itemku…". Risiko di PRICE_AUTOMATION.md |
| 4 | Agent Control | **Hapus dari sidebar** | F11 |
| 5 | F13 (fitur bot ala Peblet) | **Ya, ketiganya**: tag bot, auto-accept friend, proxy per bot | Urutan: F13a, lalu F13b dan F13c. Lihat catatan risiko di F13 |
| 6 | Marketplace pertama price automation | **Itemku** | Kredensial Itemku belum ada, jadi tahap mode lapor dulu |
| 7 | Selisih undercut dan interval | **Lewat konfigurasi**, bukan angka tetap | Default global dari `.env`, bisa ditimpa per produk |

Semua keputusan sudah terisi. Yang tersisa adalah pengecekan teknis di PRICE_AUTOMATION.md
(kredensial Itemku yang akan Anda tambahkan, serta cara scraping halaman publik Itemku yang belum
terlihat di bundle Peblet dan harus ditentukan sendiri). Arti `nominal` sudah terjawab.

## 6. Kriteria selesai

- Tidak ada halaman dashboard yang memakai kelas warna `cyan-*` atau `slate-*` langsung
  (semua lewat token).
- `npm run build` dan `npm run lint` lolos di frontend. `pytest` lolos di backend.
- Tidak ada secret di bundle (`grep` terhadap `.next/static` seperti audit sebelumnya).
- Setiap fitur yang menulis ke marketplace punya flag `.env` dan default `false`.

## 7. Risiko

| Risiko | Mitigasi |
|---|---|
| Restyle merusak halaman yang sudah teruji | Per halaman, satu commit, cek manual di dashboard |
| shadcn CLI terbaru menargetkan Tailwind 4, repo ini Tailwind 3 | Pakai CLI versi yang mendukung v3, atau salin komponen manual. Verifikasi dulu sebelum install |
| API Itemku/G2G tidak sesuai asumsi | Jangan kode sebelum ada dokumentasi resmi |
| Sumber harga kompetitor tidak jelas | Pertanyaan terbuka di PRICE_AUTOMATION.md, putuskan sebelum F9 |

## 5c. Rute tambahan Peblet (dibaca dari string bundle, bukan dari tampilan asli)

Halaman ini terkunci di akun Free dan budget browser habis, jadi yang terlihat hanya teks UI dan nama fungsi klien.
Fungsi tiap halaman di bawah adalah SIMPULAN dari teks tersebut.

### Diambil
- F14. Tandai order "sudah saya kirim sendiri". Teks Peblet: "Already sent it yourself?", "Delivered - skipped".
  Aksi manual di Orders untuk order yang dikirim di luar bot. Wajib tercatat sebagai `manual`, terpisah dari
  `done` yang terverifikasi inventory, agar prinsip verifikasi proyek ini tidak bocor.
- F6 (tambahan). Catatan pengiriman tidak bisa diubah setelah selesai. Teks Peblet: "Recorded by the system at the
  moment of delivery - not editable after the fact." Simpan snapshot saat order selesai.
- F13a (tambahan). Routing produk ke bot ber-tag atau bot bertipe tertentu. Teks Peblet: "Only bots carrying this tag
  can deliver this product. Empty = any bot", dan "Orders route only to bots reporting this type".
- F15. Halaman ringkasan stok untuk menentukan apa yang boleh dilisting. Backend `/api/v1/items` dan
  `/api/v1/u7buy/stock-plan` sudah ada, jadi ini terutama pekerjaan UI.

### Ditunda sampai ada kebutuhan
- F16. Konfigurasi per game ala Peblet ("Fruit recipe", "Random draw", batas persen kelebihan dari target).
  Relevan hanya bila menjual hasil panen berdasarkan berat. Butuh data game yang belum kita punya.

### Tidak diambil
- `/simulator` dan `/coin-simulator` (keputusan Anda).
- `/redeem`: terlihat sebagai penukaran kode langganan ("lower tier than your previous plan"). Terkait SaaS.
- `/digital*`: stok kode digital (contoh teks: "Steam Wallet 10 USD"). Bukan item yang dikirim bot.
  Diambil hanya bila Anda mau menjual kode digital.
- `/webhooks`, callback keluar, whitelist, tanda tangan HMAC: untuk Open API publik, di luar cakupan.
- `/notifications`: pengumuman platform.

### Belum jelas
- `/claims`: ada `claimsPaged`, tapi isinya tidak terbaca. Mungkin riwayat klaim order oleh bot, yang di Sabar Hub
  sudah ditangani alur `claim`. Perlu melihat halaman aslinya.

### Keputusan atas bagian 5c
- F14, F15, F16 **disetujui** (F16 tetap ditunda sampai ada kebutuhan jual hasil panen berdasarkan berat).
- `/digital*` **tidak diambil**. Sabar Hub tidak menjual kode digital.
- `/simulator` dan `/coin-simulator` tidak diambil.
- `/claims` tetap belum jelas, tidak dikerjakan sebelum ada tampilan aslinya.
