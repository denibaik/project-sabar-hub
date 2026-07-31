"""Probe READ-ONLY ke API U7Buy — untuk mengetahui bentuk data sebenarnya.

Dokumentasi U7Buy tidak memuat contoh isi respons, jadi skrip ini memanggil
endpoint baca dan memaparkan STRUKTUR-nya (nama field + tipe), bukan menebak.

Yang dipanggil hanya endpoint baca:
    GET /open-api/order/list
    GET /open-api/order/{orderId}
    GET /open-api/order/delivery_param_info

Endpoint yang MENGUBAH keadaan (start_deliery, complete_deliery) sengaja TIDAK
dipanggil — itu akan mengubah status order sungguhan di marketplace.

Nilai yang tampak seperti rahasia atau data pribadi dipendekkan/disamarkan.

Jalankan:
    .venv/Scripts/python.exe scripts/u7buy_probe.py
    .venv/Scripts/python.exe scripts/u7buy_probe.py --order-id 1966432766178033667
"""
from __future__ import annotations

import argparse
import base64
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.core.config import settings  # noqa: E402

SENSITIVE_HINTS = ("secret", "token", "password", "passwd", "apikey", "api_key", "email", "phone")


def redact(key: str, value):
    """Pendekkan nilai panjang; samarkan yang terlihat sensitif."""
    if isinstance(value, str):
        if any(h in key.lower() for h in SENSITIVE_HINTS):
            return f"<disamarkan, {len(value)} karakter>"
        return value if len(value) <= 80 else value[:77] + "..."
    return value


def describe(node, indent: int = 2, path: str = ""):
    """Cetak struktur: nama field, tipe, dan contoh nilai (dipendekkan)."""
    pad = " " * indent
    if isinstance(node, dict):
        for k, v in node.items():
            if isinstance(v, (dict, list)):
                kind = "obj" if isinstance(v, dict) else f"list[{len(v)}]"
                print(f"{pad}{k}: {kind}")
                describe(v, indent + 2, f"{path}.{k}")
            else:
                print(f"{pad}{k}: {type(v).__name__} = {redact(k, v)!r}")
    elif isinstance(node, list):
        if not node:
            print(f"{pad}(kosong)")
        else:
            print(f"{pad}[0]:")
            describe(node[0], indent + 2, f"{path}[0]")
            if len(node) > 1:
                print(f"{pad}... {len(node) - 1} entri lain (struktur sama)")


def call(path: str, params: dict | None = None):
    if not settings.u7buy_app_id or not settings.u7buy_app_secret:
        print("[!] U7BUY_APP_ID / U7BUY_APP_SECRET belum diisi di .env")
        sys.exit(1)

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
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return resp.status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(body)
        except ValueError:
            return e.code, {"_raw": body[:500]}
    except Exception as e:  # noqa: BLE001
        return 0, {"_error": str(e)}


def section(title: str):
    print(f"\n{'=' * 60}\n{title}\n{'=' * 60}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--order-id", help="periksa satu order tertentu")
    ap.add_argument("--page-size", type=int, default=5)
    args = ap.parse_args()

    if not settings.u7buy_app_id or not settings.u7buy_app_secret:
        print("[!] Kredensial belum ada. Isi di raynor-hub-backend/.env :")
        print("     U7BUY_APP_ID=...")
        print("     U7BUY_APP_SECRET=...")
        sys.exit(1)

    print(f"Base URL: {settings.u7buy_base_url}")
    print(f"AppId   : terisi ({len(settings.u7buy_app_id)} karakter)")

    section("1. GET /open-api/order/list")
    status, data = call("/open-api/order/list", {"pageNum": 1, "pageSzie": args.page_size})
    print(f"HTTP {status}")
    describe(data)

    order_id = args.order_id
    if not order_id and isinstance(data, dict):
        # coba temukan satu orderId dari respons untuk diperiksa lebih lanjut
        def find_order_id(node):
            if isinstance(node, dict):
                for k, v in node.items():
                    if k.lower() in ("orderid", "order_id") and v:
                        return str(v)
                    found = find_order_id(v)
                    if found:
                        return found
            elif isinstance(node, list):
                for item in node:
                    found = find_order_id(item)
                    if found:
                        return found
            return None
        order_id = find_order_id(data)
        if order_id:
            print(f"\n-> orderId ditemukan otomatis: {order_id}")

    if not order_id:
        print("\n[!] Tidak ada orderId untuk diperiksa. Kalau memang belum ada order,")
        print("  buat satu order uji di U7Buy lalu jalankan ulang dengan --order-id.")
        return

    section(f"2. GET /open-api/order/{{orderId}}  (orderId={order_id})")
    status, data = call(f"/open-api/order/{order_id}")
    print(f"HTTP {status}")
    describe(data)

    section("3. GET /open-api/order/delivery_param_info")
    print("   <-- DI SINI username Roblox pembeli seharusnya berada")
    status, data = call("/open-api/order/delivery_param_info", {"orderId": order_id})
    print(f"HTTP {status}")
    describe(data)

    print("\nSelesai. Endpoint yang mengubah status (start/complete delivery) TIDAK dipanggil.")


if __name__ == "__main__":
    main()
