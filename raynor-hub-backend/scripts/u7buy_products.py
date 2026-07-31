"""Daftar produk U7Buy yang pernah terjual — bahan untuk menyusun product_map.

Nama produk U7Buy tidak bisa dipakai langsung sebagai item_key. Bentuknya
seperti:

    "150x Trowel | Grow A Garden 2 | Instant Delivery"

Angka di depan adalah jumlah per unit, dan ekor "| ... | ..." adalah embel-embel
pemasaran. Skrip ini menelusuri seluruh riwayat order, mengumpulkan produk yang
berbeda, lalu mengusulkan pemetaannya — usulan saja, tetap harus diperiksa
manusia sebelum dipakai mengirim barang.

READ-ONLY. Tidak ada endpoint yang mengubah status yang dipanggil.

Jalankan:
    .venv/Scripts/python.exe scripts/u7buy_products.py
    .venv/Scripts/python.exe scripts/u7buy_products.py --json > product_map.json
"""
from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # noqa: BLE001
    pass

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.core.config import settings  # noqa: E402


def call(path: str, params: dict | None = None):
    url = settings.u7buy_base_url.rstrip("/") + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    creds = base64.b64encode(
        f"{settings.u7buy_app_id}:{settings.u7buy_app_secret}".encode()
    ).decode()
    req = urllib.request.Request(url, headers={
        "Authorization": f"Basic {creds}",
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8", errors="replace"))
    except urllib.error.HTTPError as e:
        return e.code, {"_raw": e.read().decode("utf-8", errors="replace")[:300]}
    except Exception as e:  # noqa: BLE001
        return 0, {"_error": str(e)}


def urai_nama(nama: str) -> tuple[str, int]:
    """"150x Trowel | Grow A Garden 2 | ..." -> ("Trowel", 150)."""
    inti = nama.split("|")[0].strip()
    m = re.match(r"^(\d+)\s*x\s+(.*)$", inti, re.IGNORECASE)
    if m:
        return m.group(2).strip(), int(m.group(1))
    return inti, 1


# Kategori ditebak dari kata kunci pada nama. Sengaja konservatif: yang tidak
# yakin dibiarkan kosong agar diisi manusia, bukan ditebak asal.
PETUNJUK = [
    (r"\bsprinkler\b", "Sprinklers"),
    (r"\bwatering can\b", "WateringCans"),
    (r"\btrowel\b", "Trowels"),
    (r"\bseed pack\b", "SeedPacks"),
    (r"\braccoon\b", "Raccoons"),
    (r"\bseed\b", "Seeds"),
]


def tebak_kategori(nama: str) -> str:
    rendah = nama.lower()
    for pola, kategori in PETUNJUK:
        if re.search(pola, rendah):
            return kategori
    return ""


def bersihkan_item(nama: str, kategori: str) -> str:
    """Buang kata jenis di belakang; backend memakluminya, tapi lebih rapi begini."""
    if kategori in ("Seeds", "Pets"):
        return re.sub(r"\s*\b(seeds?|pets?)\b\s*$", "", nama, flags=re.IGNORECASE).strip()
    return nama


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-pages", type=int, default=120)
    ap.add_argument("--game", default="Grow a Garden 2",
                    help="hanya kumpulkan produk game ini; kosongkan untuk semua")
    ap.add_argument("--json", action="store_true", help="cetak kerangka product_map saja")
    args = ap.parse_args()

    if not settings.u7buy_app_id or not settings.u7buy_app_secret:
        print("[!] U7BUY_APP_ID / U7BUY_APP_SECRET belum diisi di .env")
        sys.exit(1)

    produk: dict[str, dict] = {}
    per_game: dict[str, int] = {}
    total = None
    dibaca = 0

    # Ukuran halaman terkunci 10 di sisi U7Buy — mencoba pageSize/limit/size
    # tidak mengubahnya. Jadi berhenti saat halaman kosong, bukan saat halaman
    # lebih pendek dari yang diminta.
    for halaman in range(1, args.max_pages + 1):
        status, data = call("/open-api/order/list", {"pageNum": halaman})
        if status != 200 or not isinstance(data, dict) or data.get("code") != 200:
            print(f"[!] halaman {halaman} gagal: HTTP {status} {str(data)[:200]}", file=sys.stderr)
            break

        isi = data.get("data") or {}
        total = isi.get("total", total)
        baris = isi.get("rows") or []
        if not baris:
            break
        dibaca += len(baris)

        for r in baris:
            game = r.get("gameName") or "(tanpa game)"
            per_game[game] = per_game.get(game, 0) + 1
            if args.game and game != args.game:
                continue
            pid = str(r.get("productId") or "")
            if not pid:
                continue
            p = produk.setdefault(pid, {"nama": r.get("productName") or "", "jumlah": 0})
            p["jumlah"] += 1

        if not args.json and halaman % 10 == 0:
            print(f"  {dibaca} order dibaca, {len(produk)} produk berbeda…", file=sys.stderr)
        if total is not None and dibaca >= total:
            break
        time.sleep(0.25)  # jangan membanjiri API mereka

    if args.json:
        keluaran = {}
        for pid, p in sorted(produk.items(), key=lambda kv: -kv[1]["jumlah"]):
            nama, per_unit = urai_nama(p["nama"])
            kategori = tebak_kategori(nama)
            keluaran[pid] = {
                "category": kategori,
                "item_key": bersihkan_item(nama, kategori),
                "per_unit": per_unit,
                "_produk": p["nama"],
            }
        print(json.dumps({"product_map": keluaran}, indent=2, ensure_ascii=False))
        return

    print(f"\nOrder dibaca: {dibaca} dari {total} | produk berbeda: {len(produk)}")
    print("\nSebaran per game:")
    for g, n in sorted(per_game.items(), key=lambda kv: -kv[1]):
        tanda = "  <- diproses bot" if g == args.game else ""
        print(f"  {n:>5}  {g}{tanda}")
    print()
    print(f"{'ORDER':>6}  {'PER':>4}  {'KATEGORI':<13} {'ITEM_KEY':<26} PRODUK U7BUY")
    print("-" * 108)
    belum = 0
    for pid, p in sorted(produk.items(), key=lambda kv: -kv[1]["jumlah"]):
        nama, per_unit = urai_nama(p["nama"])
        kategori = tebak_kategori(nama)
        item = bersihkan_item(nama, kategori)
        if not kategori:
            belum += 1
        print(f"{p['jumlah']:>6}  {per_unit:>4}  {kategori or '?????':<13} {item:<26} {p['nama'][:44]}")

    print(f"\n{len(produk) - belum} produk terusulkan, {belum} perlu diisi manual.")
    print("Usulan ini BELUM diverifikasi ke katalog game — periksa dulu sebelum dipakai.")


if __name__ == "__main__":
    main()
