# UI Spec: Glassmorphism Monokrom

Basis: `raynor-hub-frontend` (Next.js 15, Tailwind 3, Radix, lucide-react). Token memakai
format HSL tanpa `hsl()` seperti `globals.css` sekarang, jadi komponen shadcn yang ada tetap jalan.

## 1. Token (`src/app/globals.css`, ganti blok `.dark`, jadikan dark sebagai default)

```css
.dark {
  --background: 0 0% 4%;            /* #0a0a0a */
  --foreground: 0 0% 98%;
  --card: 0 0% 100% / 0.05;         /* dipakai lewat .glass, bukan bg-card */
  --card-foreground: 0 0% 98%;
  --popover: 0 0% 7%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 0 0% 4%;
  --secondary: 0 0% 100% / 0.08;
  --secondary-foreground: 0 0% 98%;
  --muted: 0 0% 100% / 0.06;
  --muted-foreground: 0 0% 70%;
  --accent: 0 0% 100% / 0.10;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 72% 55%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 100% / 0.10;
  --input: 0 0% 100% / 0.10;
  --ring: 0 0% 100% / 0.30;
  --radius: 0.75rem;
}
```

Catatan: Tailwind 3 dengan `hsl(var(--x))` tidak mendukung alpha di dalam variabel. Kalau
`/ 0.05` bermasalah, ganti token tembus pandang dengan `rgba()` langsung di `.glass`.
Cek hasilnya di browser sebelum memakai di semua halaman.

Monokrom tidak berarti status tanpa warna. Status order tetap perlu dibedakan. Aturan:
status dibedakan lewat **ikon + label + ketebalan border**, dengan satu pengecualian warna
fungsional untuk `failed` (merah `--destructive`). Putuskan bersama apakah `done` dan
`pending` cukup dibedakan dengan ikon.

## 2. Utilitas glass

```css
@layer components {
  .glass {
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: var(--radius);
    box-shadow: 0 8px 32px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.04);
  }
  .glass-hover { transition: background .2s, border-color .2s, transform .2s; }
  .glass-hover:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); }
}
```

Latar halaman: `#0a0a0a` dengan dua bola blur putih redup (opacity 0.05) agar efek kaca terlihat.
Tanpa latar yang bervariasi, glassmorphism hampir tidak kelihatan.

## 3. Komponen shadcn

Sudah ada: avatar, badge, button, calendar, card, table, tabs.

Perlu ditambah: input, label, select, switch, checkbox, dialog, sheet, dropdown-menu (paket Radix
sudah terpasang), tooltip (terpasang), scroll-area (terpasang), separator (terpasang), skeleton,
sonner (toast).

Peringatan: `npx shadcn@latest add` menargetkan versi terbaru yang bisa berasumsi Tailwind 4 dan
React 19. Repo ini Tailwind 3.4. Sebelum menjalankan, cek `components.json` yang dihasilkan dan
diff file pertama yang ditambahkan. Kalau tidak cocok, salin komponen dari dokumentasi shadcn
versi Tailwind 3 secara manual. Saya belum menjalankan CLI-nya, jadi ini belum terverifikasi.

Perubahan pada komponen yang sudah ada:
- `card.tsx`: tambahkan variant `glass` (pakai kelas `.glass`).
- `badge.tsx`: variant `success|warning|danger|neutral` berbasis ikon + border.
- `button.tsx`: `default` putih solid teks hitam, `outline` border putih transparan, `ghost`.
- `table.tsx`: header `text-muted-foreground uppercase text-xs`, baris hover `bg-white/5`.

## 4. Layout

Sidebar 256px (sekarang `w-64`, sudah sama): `glass`, tanpa `bg-slate-950`. Item aktif
`bg-white/10 text-white`, tidak aktif `text-white/60`. Top-bar sticky `glass` blur 12px.
Mobile: sidebar jadi `Sheet` dari kiri (sekarang disembunyikan di bawah `md`, belum ada menu mobile).

## 5. Halaman

| Halaman | Rute sekarang | Perubahan |
|---|---|---|
| Dashboard | `/dashboard` | 4 kartu statistik glass, tabel order terbaru, ringkasan bot online |
| Orders | `/orders` | Filter status + sumber (Select), detail di Sheet, tombol Cancel (API sudah ada), pagination (API sudah ada) |
| Products | `/products` | Sekarang hanya daftar item agregat stok. Tambah pencarian dan Skeleton saat loading |
| Inventory | `/inventory` | Gaya tabel baru, grup per kategori |
| Bot Network | `/bots` | Kartu bot dengan indikator heartbeat, Dialog untuk Register Bot, konfirmasi cabut token |
| Delivery Proof | **baru** `/delivery-proof` | Tabel order `done`/`partial` + Sheet detail. Lihat PRD F6 |
| Marketplace | `/marketplace/*` | Form nyata menggantikan placeholder `[slug]`, mulai dari yang punya API |
| Setup | `/marketplace/setup/*` | Restyle saja |
| Agent Control | `/ai-control-center` | Masih mock. Putuskan: ganti atau hapus dari sidebar |

## 6. Urutan kerja (satu commit per langkah)

1. Token + `.glass` + latar halaman. Cek tampilan satu halaman dulu.
2. Komponen shadcn yang kurang + perubahan komponen existing.
3. Sidebar + top-bar + layout mobile.
4. Dashboard, Orders, Bots, Products, Inventory, berurutan.
5. Delivery Proof (halaman baru).
6. Form channel.

Setelah tiap langkah: `npm run lint` dan `npm run build`. Verifikasi visual manual di
dashboard karena tidak ada test UI di repo.

## 7. Prompt siap salin untuk model pengerja

```
Repo: project-sabar-hub/raynor-hub-frontend (Next.js 15, Tailwind 3, shadcn-style components).
Baca docs/revisi/UI_SPEC.md dan docs/revisi/PRD.md dulu.
Kerjakan SATU langkah dari bagian "Urutan kerja" per sesi, mulai langkah 1.
Aturan: jangan ubah lib/api atau route handler. Jangan pakai kelas warna cyan-*/slate-* langsung,
gunakan token. Jangan tambah dependency tanpa menyebutkan alasannya. Jalankan lint dan build
sebelum menyatakan selesai.
```
