"""Daftar listing U7Buy — bahan untuk menyusun product_map.

Sumbernya `offer_common/list`, bukan riwayat order. Riwayat order hanya memuat
produk yang KEBETULAN pernah laku dalam jendela yang dikembalikan API — waktu
dicoba, hanya 2 dari 12 listing yang muncul. Listing yang belum pernah terjual
justru yang paling berbahaya kalau belum dipetakan: order pertamanya langsung
gagal.

`offerId` pada daftar ini sama dengan `productId` pada order — sudah dicocokkan
terhadap dua ID yang diketahui dari riwayat.

Nama listing tidak bisa dipakai langsung sebagai item_key. Bentuknya seperti:

    "150x Trowel | Grow A Garden 2 | Instant Delivery"

Angka di depan adalah jumlah per unit, dan ekor "| ... | ..." embel-embel
pemasaran. Yang dicetak di sini hanyalah USULAN — tetap harus diperiksa manusia
sebelum dipakai mengirim barang.

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
from app.infrastructure.marketplaces.u7buy_catalog import (  # noqa: E402
    parse_offer_name as urai_nama, guess_category as tebak_kategori,
    clean_item_key as bersihkan_item,
)


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


def temukan_business_id() -> str:
    """Ambil businessId dari satu order mana pun; endpoint offer mewajibkannya."""
    st, d = call("/open-api/order/list", {"pageNum": 1})
    if st != 200 or not isinstance(d, dict):
        return ""
    for r in ((d.get("data") or {}).get("rows") or []):
        if r.get("businessId"):
            return str(r["businessId"])
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-pages", type=int, default=120)
    ap.add_argument("--business-id", default="", help="kosong = ditemukan sendiri dari satu order")
    ap.add_argument("--game", default="Grow a Garden 2",
                    help="hanya kumpulkan produk game ini; kosongkan untuk semua")
    ap.add_argument("--json", action="store_true", help="cetak kerangka product_map saja")
    args = ap.parse_args()

    if not settings.u7buy_app_id or not settings.u7buy_app_secret:
        print("[!] U7BUY_APP_ID / U7BUY_APP_SECRET belum diisi di .env")
        sys.exit(1)

    business_id = args.business_id or temukan_business_id()
    if not business_id:
        print("[!] businessId tidak ditemukan; berikan lewat --business-id", file=sys.stderr)
        sys.exit(1)

    produk: dict[str, dict] = {}
    per_game: dict[str, int] = {}
    total = None
    dibaca = 0

    for halaman in range(1, args.max_pages + 1):
        st, d = call("/open-api/offer_common/list",
                     {"pageNum": halaman, "pageSize": 50, "businessId": business_id})
        if st != 200 or not isinstance(d, dict) or d.get("code") != 200:
            print(f"[!] halaman {halaman} gagal: HTTP {st} {str(d)[:200]}", file=sys.stderr)
            break
        isi = d.get("data") or {}
        total = isi.get("totalCount", total)
        baris = isi.get("pageResult") or []
        if not baris:
            break
        dibaca += len(baris)

        for o in baris:
            game = o.get("entityName") or "(tanpa game)"
            per_game[game] = per_game.get(game, 0) + 1
            if args.game and game != args.game:
                continue
            oid = str(o.get("offerId") or "")
            if not oid:
                continue
            produk[oid] = {
                "nama": o.get("offerName") or "",
                "jumlah": int(o.get("saleNum") or 0),
                "stok": o.get("inventory"),
                "dijual": bool(o.get("onSale")),
            }

        if total is not None and dibaca >= total:
            break
        time.sleep(0.25)

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
    print(f"{'TERJUAL':>7} {'STOK':>5} {'PER':>4}  {'KATEGORI':<13} {'ITEM_KEY':<24} LISTING")
    print("-" * 112)
    belum = 0
    for pid, p in sorted(produk.items(), key=lambda kv: -kv[1]["jumlah"]):
        nama, per_unit = urai_nama(p["nama"])
        kategori = tebak_kategori(nama)
        item = bersihkan_item(nama, kategori)
        if not kategori:
            belum += 1
        tanda = "" if p.get("dijual", True) else "  (nonaktif)"
        print(f"{p['jumlah']:>7} {str(p.get('stok')):>5} {per_unit:>4}  "
              f"{kategori or '?????':<13} {item:<24} {p['nama'][:40]}{tanda}")

    print(f"\n{len(produk) - belum} produk terusulkan, {belum} perlu diisi manual.")
    print("Usulan ini BELUM diverifikasi ke katalog game — periksa dulu sebelum dipakai.")


if __name__ == "__main__":
    main()
