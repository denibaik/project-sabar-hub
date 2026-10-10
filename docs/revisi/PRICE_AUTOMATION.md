# Price Automation (undercut)

Status: desain. Belum ada kode di backend.

## Apa yang sebenarnya dibaca dari judul

Koreksi dari analisis awal: string Peblet "No competitor amount could be read from titles"
berarti **jumlah barang** (amount) yang dibaca dari judul listing, bukan harga.
Alasannya: listing kompetitor dijual dalam jumlah berbeda ("1M Sheckles" vs "500K Sheckles").
Harga baru bisa dibandingkan setelah dinormalkan ke harga per unit.

```
harga_per_unit = harga_listing / jumlah_di_judul
```

Kalau jumlah tidak bisa dibaca, listing itu dilewati. Sesuai prinsip proyek: jangan menebak.

## Rumus undercut

```
target_unit   = min(harga_per_unit kompetitor, tanpa listing milik sendiri) - selisih
harga_baru    = target_unit * jumlah_listing_kita
harga_baru    = max(harga_baru, floor)        # floor wajib, tanpa floor tidak disentuh
```

Aturan:
- Listing milik sendiri dikeluarkan dari perbandingan.
- Hanya listing yang punya floor yang diproses.
- Jangan turun di bawah floor, jangan naik di atas harga sekarang kecuali dikonfigurasi.
- Tulis log setiap keputusan (harga lama, kompetitor, harga baru, alasan skip).

## Referensi kode

Kode ada di `raynor-hub-backend/app/domain/pricing/amount_parser.py`, tesnya di
`raynor-hub-backend/tests/test_price_engine.py` (13 test lolos, termasuk kasus parser di bawah).
Perilaku yang diuji:

| Judul | Hasil |
|---|---|
| `1M Sheckles` | 1000000 |
| `150x Trowel` / `Trowel x150` | 150 |
| `Sheckles 1.000.000` | 1000000 |
| `1,5jt Sheckles` | 1500000 |
| `Sheckles 1M - Rp 15.000` | 1000000 (harga diabaikan) |
| `Rainbow Seed Rp 15.000` | None (hanya harga) |
| `Grow a Garden 2 Sheckles` | None (angka 2 adalah nama game) |
| `1M Sheckles + 500K Bonus` | None (dua jumlah, ambigu) |

Batasan yang diketahui: parser ini heuristik. Judul dengan format yang belum diuji bisa salah
baca atau None. Tambahkan kasus nyata dari listing sendiri sebelum dipercaya.

## Sumber harga kompetitor (keputusan: scraping, seperti Peblet)

Peblet mengambil listing kompetitor dengan scraping di server (label UI: "Scraping Itemku…").
Detail yang terlihat ada di PEBLET_ANALYSIS.md bagian 7. Rancangan untuk Sabar Hub:

- Fetcher per marketplace yang mengembalikan `offers[]` berisi `shop_name`, `title`, `price`.
- Daftar blacklist toko per marketplace. Toko di blacklist dikeluarkan sebelum mencari harga termurah.
  Toko sendiri selalu masuk blacklist otomatis.
- Dibatasi: jeda antar request, cache hasil beberapa menit, dan berhenti sementara bila dibatasi atau diblokir.
  Jangan mengulang agresif.
- Bila fetcher gagal atau tidak ada listing yang bisa dibaca, aksinya `skip` dengan alasan. Harga tidak disentuh.

Risiko yang tetap ada: halaman bisa berubah, akses bisa diblokir, dan scraping bisa melanggar ketentuan layanan
marketplace. Baca ketentuan marketplace sebelum mengaktifkan mode tulis.

## Keputusan

1. **Marketplace pertama: Itemku.**
2. **Selisih undercut, floor, nominal, dan interval diatur lewat konfigurasi**, bukan angka tetap di kode.
   Mengikuti Peblet: floor (`min_price`) dan `nominal` disimpan per produk, interval sweep diatur di
   pengaturan. Selisih undercut: default global dari `.env`, bisa ditimpa per produk.
3. Daftar toko yang diabaikan (blacklist) disimpan per marketplace.

## Yang masih perlu dicek sebelum membangun (belum terjawab)

- **Kredensial Itemku.** Belum ada di repo ini (PROJECT_STATUS: "butuh kredensial Itemku/G2G").
  Membaca harga kompetitor lewat scraping mungkin tidak butuh kredensial, tapi mengubah harga dan stok di
  listing sendiri butuh akses API Itemku. Tahap 1 (mode lapor) bisa jalan tanpa itu, tahap 2 (mode tulis) tidak.
- **Struktur halaman publik Itemku** dan ketentuan layanannya. Belum pernah saya buka.
- **Kredensial Itemku:** akan Anda tambahkan nanti (keputusan). Sampai itu ada, hanya mode lapor yang bisa dibangun.
- **Cara scraping.** Dicek ulang di bundle Peblet: tidak terlihat (hanya label "Scraping Itemku…"). Metodenya
  harus kita tentukan sendiri setelah melihat halaman publik Itemku.

`nominal` sudah terjawab (PEBLET_ANALYSIS.md bagian 7): jumlah barang per listing, diisi per kompetitor dari
judulnya. Perbandingan memakai `price / nominal`, tampilannya harga per 1 juta unit. Ini sama dengan rumus
`harga_per_unit` di atas, dan `app/domain/pricing/amount_parser.py` berfungsi sebagai pengisi `nominal`.

## Rencana bertahap

1. **Mode lapor:** hitung dan tampilkan "harga yang akan dipasang", tidak menulis apa pun.
2. **Mode tulis:** di balik flag `.env` (`PRICE_AUTOMATION_WRITE_ENABLED=false` default), meniru pola
   `U7BUY_STOCK_SYNC_ENABLED`.
3. **Terjadwal:** sweeper dengan interval dari env, pola sama dengan backorder sweeper.

## Data baru (usulan)

Tabel `price_rules`: `id`, `channel_id`, `listing_ref`, `floor`, `undercut_amount`, `enabled`,
`updated_at`. Tabel `price_log`: `id`, `rule_id`, `old_price`, `competitor_unit`, `new_price`,
`action` (`update|skip`), `reason`, `created_at`. Migrasi lewat Alembic autogenerate.
