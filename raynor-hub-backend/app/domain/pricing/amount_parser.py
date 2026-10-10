"""Baca JUMLAH barang dari judul listing (bukan harga).

Dipakai untuk menormalkan harga: harga_per_unit = harga_listing / jumlah.
Prinsip proyek: kalau ambigu, kembalikan None. Jangan menebak.
"""
from __future__ import annotations

import re

_MULT = {"k": 10**3, "rb": 10**3, "ribu": 10**3,
         "m": 10**6, "jt": 10**6, "juta": 10**6, "b": 10**9}

# angka + suffix opsional. Tidak boleh menempel pada huruf/angka lain.
_TOKEN = re.compile(
    r"(?<![A-Za-z0-9.,])(\d[\d.,]*)\s*(ribu|juta|rb|jt|k|m|b|x)?(?![A-Za-z0-9])",
    re.IGNORECASE,
)
_PREFIX_X = re.compile(r"(?<![A-Za-z0-9])x\s*(\d[\d.,]*)(?![A-Za-z0-9])", re.IGNORECASE)
_PRICE_BEFORE = re.compile(r"(rp\.?|idr|usd|\$)\s*$", re.IGNORECASE)
_THOUSANDS = re.compile(r"^\d{1,3}([.,]\d{3})+$")


def _to_number(raw: str, has_multiplier: bool) -> float | None:
    raw = raw.rstrip(".,")
    if _THOUSANDS.match(raw) and not has_multiplier:
        return float(re.sub(r"[.,]", "", raw))      # 1.000.000 -> 1000000
    if re.match(r"^\d+([.,]\d{1,2})$", raw):
        return float(raw.replace(",", "."))         # 1,5 / 1.5
    if raw.isdigit():
        return float(raw)
    return None


def parse_amount(title: str) -> int | None:
    """Jumlah barang dari judul, atau None bila tidak ada / ambigu."""
    title = title or ""
    strong: list[float] = []   # punya suffix (1M, 500K, 150x) atau awalan x150
    weak: list[float] = []     # angka berformat ribuan tanpa suffix (1.000.000)
    for m in _TOKEN.finditer(title):
        if _PRICE_BEFORE.search(title[: m.start()]):
            continue                                # itu harga, bukan jumlah
        suffix = (m.group(2) or "").lower()
        mult = 1 if suffix in ("", "x") else _MULT[suffix]
        n = _to_number(m.group(1), has_multiplier=mult > 1)
        if n is None:
            continue
        if suffix:
            strong.append(n * mult)
        elif _THOUSANDS.match(m.group(1)):
            weak.append(n)
    for m in _PREFIX_X.finditer(title):
        n = _to_number(m.group(1), False)
        if n is not None:
            strong.append(n)
    uniq = sorted(set(strong or weak))
    if len(uniq) != 1 or uniq[0] <= 0:
        return None
    return int(uniq[0])
