"""Menerjemahkan nama listing U7Buy menjadi usulan item katalog game.

Dipakai bersama oleh skrip `scripts/u7buy_products.py` dan endpoint dashboard,
supaya aturannya tidak bercabang dua dan berbeda diam-diam.

Semua yang dihasilkan di sini hanyalah USULAN. Yang tidak bisa ditentukan
dibiarkan kosong agar diisi manusia — menebak berarti berisiko mengirim barang
yang salah, dan itu lebih merugikan daripada order yang tertunda.
"""
from __future__ import annotations

import re

# Kategori ditebak dari kata kunci pada nama listing. Sengaja konservatif:
# urutannya penting karena "Secret Seed Pack" harus jatuh ke SeedPacks, bukan
# Seeds.
PETUNJUK = [
    (r"\bseed pack\b", "SeedPacks"),
    (r"\bsprinkler\b", "Sprinklers"),
    (r"\bwatering can\b", "WateringCans"),
    (r"\btrowel\b", "Trowels"),
    (r"\braccoon\b", "Raccoons"),
    (r"\bseed\b", "Seeds"),
]


def parse_offer_name(nama: str) -> tuple[str, int]:
    """"150x Trowel | Grow A Garden 2 | ..." -> ("Trowel", 150).

    Jumlah per unit tertanam di judul listing, bukan di field tersendiri. Tanpa
    membacanya, pembeli hanya menerima satu dari sekian yang dibayarnya.
    """
    inti = nama.split("|")[0].strip()
    m = re.match(r"^(\d+)\s*x\s+(.*)$", inti, re.IGNORECASE)
    if m:
        return m.group(2).strip(), int(m.group(1))
    return inti, 1


def guess_category(nama: str) -> str:
    rendah = nama.lower()
    for pola, kategori in PETUNJUK:
        if re.search(pola, rendah):
            return kategori
    return ""


def clean_item_key(nama: str, kategori: str) -> str:
    """Buang kata jenis di belakang nama; katalog game menyimpannya polos."""
    if kategori in ("Seeds", "Pets"):
        return re.sub(r"\s*\b(seeds?|pets?)\b\s*$", "", nama, flags=re.IGNORECASE).strip()
    return nama


def suggest(offer_name: str) -> dict:
    nama, per_unit = parse_offer_name(offer_name)
    kategori = guess_category(nama)
    return {
        "category": kategori,
        "item_key": clean_item_key(nama, kategori),
        "per_unit": per_unit,
    }
