# Analisis Peblet Hub (referensi revisi)

Sumber: bundle JS publik `peblet-mp.pebletz.xyz` + login akun Free (paket tanpa langganan).
Tanggal analisis: Oktober 2026.

Legenda: **[TERLIHAT]** ada di bundle/UI · **[SIMPULAN]** tafsiran saya · **[TIDAK TAHU]** tidak bisa dibuktikan.

## 1. Yang berhasil diverifikasi

**[TERLIHAT] Halaman yang bisa dibuka (akun Free):** Dashboard, How to Use, Auto-Accept
(`/proxy-manager`), Developer API (terkunci, fitur Bloom+), Subscription.

**[TERLIHAT] Halaman terkunci** (redirect ke `/subscription`): Orders, Products,
Delivery Proof, Receive History, menu GAME (Bot Management, Stock Summary, Config, Bot Script).
Layout tabelnya TIDAK pernah terlihat langsung. Kolom yang dicatat di dokumen lain
adalah rekonstruksi dari string label di bundle.

**[TERLIHAT] Design token:** latar `#050A16`, font Inter, aksen biru `#4F8BFF`, bahaya `#FB7185`,
peringatan `#FBBF24`. Kelas `.card` = border `#ffffff1f`, background `#00000040`, radius 10px.
Sidebar 248px, footer "All systems operational".

**[TERLIHAT] Rute marketplace:** `/marketplace/itemku/{config,orders,products,undercut-log}`,
`/marketplace/g2g/{config,manage-offers,offers,orders,undercut-log}`.

**[TERLIHAT] Nama fungsi klien:** `pollItemku`, `itemkuProducts`, `itemkuUpdatePrice(product_id,new_price)`,
`itemkuUpdateStock(product_id,new_stock)`, `itemkuSetFloor`, `itemkuUndercut`, `itemkuMarket`.
Path URL lengkapnya terpotong saat ekstraksi, jadi TIDAK diketahui.

**[TERLIHAT] Status order:** `pending → processing → completed`, plus `failed`, `partial`,
`queued`, `need_username`, `product_not_found`, `no_bot`.

**[TERLIHAT] Teks bantuan penting:**
- "Undercut sets your price to the cheapest competitor minus this amount. Your own store is excluded."
- "Only offers with a floor are touched."
- "Automatically re-undercut every offer that has a price floor set, 24/7 on your own schedule."
- "No competitor amount could be read from titles - undercut can't normalize yet."
- "Marked delivered only after a bot actually sent the items... Itemku may refund the order before it ships."

## 2. Koreksi atas klaim saya sebelumnya

| Klaim lama | Status |
|---|---|
| "Itemku/G2G pakai Official API untuk harga kompetitor" | **Salah untuk Itemku.** UI Peblet berlabel "Scraping Itemku…" (bagian 7). Untuk G2G tetap [TIDAK TAHU]. |
| "Title parsing membaca HARGA dari judul" | **Salah.** Kalimatnya soal *amount* (jumlah barang) untuk normalisasi. Lihat PRICE_AUTOMATION.md. |
| Path `/api/integrations/itemku/price` dst. | **[TIDAK TAHU]**. Itu tebakan, jangan dipakai. |
| Daftar kolom tabel Orders/Products | **[SIMPULAN]** dari label, bukan dari tampilan asli. |

## 3. Perbedaan model produk

Peblet adalah SaaS multi-tenant berlangganan (Sprout/Bloom/Harvest). Sabar Hub saat ini
single-admin tanpa paket. Fitur langganan, multi-tenant, dan Open API publik sengaja
TIDAK dimasukkan ke PRD kecuali kamu memutuskan jadi SaaS (lihat PRD bagian Di Luar Cakupan).

## 4. Yang ingin diverifikasi nanti

Kalau suatu saat akun Peblet berlangganan: screenshot Orders, Products, Delivery Proof,
Receive History. Itu satu-satunya cara memastikan layout aslinya.

## 5. Inventaris path API Peblet (TERLIHAT di bundle) vs Sabar Hub

Path diambil dengan grep string `"/api/..."` dari bundle. Yang TIDAK diketahui: bentuk request/response,
aturan bisnis di server, dan cara backend mereka mendapat data marketplace. Bundle hanya memuat sisi klien.

**Koreksi:** bagian 1 menulis path Itemku "terpotong". Sekarang terlihat. Path asli memakai `/products/`:
`/api/integrations/itemku/{games,poll,products,products/price,products/stock,products/floor,products/market,products/undercut}`.
Path `/api/integrations/itemku/price` yang saya tulis di dokumen awal salah.

| Area | Peblet (path terlihat) | Sabar Hub (dari `main.py`) | Selisih |
|---|---|---|---|
| Auth | register, login, verify, reset, Discord | satu password dashboard | Sengaja beda (bukan SaaS) |
| Bot | `/bots`, `/bots/tags`, `/bots/tags/assign`, `/bots/auto-sync`, `/autoaccept`, `/proxy/config` | `/bots`, `/bots/heartbeat`, `/bots/claim`, `/bots/result`, `DELETE /bots/{id}` | Sabar tidak punya tag bot, auto-accept, proxy per bot |
| Order | `/orders`, `/orders/paged`, `/orders/open-count` | `/orders` (paging), `/orders/{id}/cancel`, `/orders/sweep` | Sabar belum punya open-count |
| Pengiriman | `/claims`, `/claims/paged`, `/deliveries`, `/deliveries/paged`, `/fulfill` | tidak ada endpoint riwayat pengiriman | **Gap utama.** Sabar tidak punya "Delivery Proof" di backend |
| Produk | `/products`, `/variants`, `/items`, `/digital/codes*`, `/products/sheckles/simulate` | hanya `/items` (agregasi stok bot) | **Gap utama.** Sabar tidak punya katalog produk. Pemetaan nama ada di sheet dan `u7buy_catalog.py` |
| Marketplace | Itemku dan G2G: harga, stok, floor, undercut, `undercut-logs`, `sales-report` | U7Buy (offers, stock-plan, stock-sync), Google Sheet sync, VCGamers via email | Itemku/G2G belum ada. Sabar belum punya undercut atau log harga |
| API publik | `/api/v1/orders`, `/api/v1/orders/:ref/username`, `/api/v1/stock`, webhook tenant | `/api/v1/webhooks/u7buy` (masuk) | Sabar tidak punya Open API keluar. Di luar cakupan |
| Langganan | `/plans`, `/subscription/*`, `/tenant/*` | tidak ada | Di luar cakupan |
| Lain | `/notifications`, `/redeem`, `/roblox-assets`, `/sheet-sync` | `/channels/*` | Sabar belum punya notifikasi |

Petunjuk, bukan bukti: Peblet punya endpoint `itemku/products/market`. Nama itu mengisyaratkan pengambilan
data pasar lewat backend mereka. Sumbernya sudah terjawab di bagian 7: scraping (untuk Itemku).

## 6. Kesimpulan kesesuaian

PRD dan UI_SPEC mengikuti struktur UI dan prinsip Sabar Hub, bukan alur backend Peblet. Tiga gap dari tabel
di atas belum tercermin penuh di PRD: katalog produk dengan alias nama, endpoint riwayat pengiriman, dan
log undercut. Sebelum implementasi, PRD perlu satu revisi untuk memutuskan mana yang diambil.

## 7. Update: sumber harga kompetitor di Peblet (TERLIHAT di bundle)

Koreksi atas bagian 2 yang menulis "TIDAK TAHU". Setelah membaca konteks `itemku/products/market`:

- Tombol pasar memanggil `POST /api/integrations/itemku/products/market` lalu menampilkan modal dengan
  label loading **"Scraping Itemku…"**. Jadi daftar listing kompetitor diambil dengan scraping oleh server mereka.
- Respons `market` berisi `offers[]` dengan minimal `shop_name` dan `price`, ditambah `min_price`, `nominal`,
  dan `blacklist`.
- Toko bisa di-blacklist: `POST /api/integrations/{marketplace}/blacklist` dengan `{shops:[...]}`.
  UI: "Ignoring {toko} when undercutting". Listing toko di blacklist dikeluarkan sebelum mencari harga termurah.
- Floor disimpan lewat `POST .../products/floor` dengan `{product_id, min_price, nominal}`.
- Undercut: `POST .../products/undercut`. Respons punya `ok`, `unchanged`, `new_price`, `floored`.
  UI: "Already at X - no change", "Undercut → X (floored)".

**[TERLIHAT]** `nominal` ada di setiap `offers[]` kompetitor, bukan hanya di listing kita. UI memfilter
`nominal > 0`, menghitung `price / nominal` untuk mencari yang termurah, dan menampilkan
`Rp {price / nominal * 1e6}`, yaitu harga per 1 juta unit. Listing dengan `nominal` kosong tidak ikut dihitung.
Ini cocok dengan pesan "No competitor amount could be read from titles": server mengisi `nominal` per listing dari
judulnya, dan bila gagal, listing itu tidak bisa dibandingkan. Input `nominal` di form floor adalah jumlah
untuk listing kita sendiri.

**[TIDAK TAHU]** Cara scrapingnya (HTML, endpoint internal Itemku, atau headless browser), seberapa sering,
dan bagaimana mereka menghadapi pembatasan akses. Itu hanya ada di server mereka.
