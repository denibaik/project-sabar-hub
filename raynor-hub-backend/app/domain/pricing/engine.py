"""Mesin keputusan undercut. Murni: tanpa jaringan, tanpa database.

Mengikuti pola yang terlihat di UI Peblet: listing kompetitor dinormalkan ke harga
per unit (price / nominal), toko di blacklist dan toko sendiri dikeluarkan, lalu harga
dipasang di bawah yang termurah, tidak pernah di bawah floor.

Listing tanpa floor tidak disentuh. Listing kompetitor yang jumlahnya tidak terbaca
dilewati. Bila tidak ada pembanding yang sah, hasilnya `skip`, bukan tebakan.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Literal

from .amount_parser import parse_amount


def _norm(shop: str) -> str:
    return (shop or "").strip().lower()


@dataclass(frozen=True)
class Offer:
    shop_name: str
    title: str
    price: float


@dataclass(frozen=True)
class Rule:
    own_shop: str
    own_amount: int          # jumlah barang pada listing kita
    current_price: int
    floor: int               # harga minimum; 0 = tidak ada floor -> tidak disentuh
    undercut: int            # dikurangkan dari harga akhir
    blacklist: frozenset[str] = frozenset()
    allow_raise: bool = False


@dataclass(frozen=True)
class Decision:
    action: Literal["update", "skip"]
    reason: str
    new_price: int | None = None
    floored: bool = False
    competitor_shop: str | None = None
    competitor_unit: float | None = None
    compared: int = 0        # listing yang ikut dibandingkan
    unreadable: int = 0      # listing yang jumlahnya tidak terbaca


def decide(rule: Rule, offers: Iterable[Offer]) -> Decision:
    if rule.floor <= 0:
        return Decision("skip", "no_floor")
    if rule.own_amount <= 0:
        return Decision("skip", "invalid_own_amount")

    excluded = {_norm(s) for s in rule.blacklist} | {_norm(rule.own_shop)}
    best_unit: float | None = None
    best_shop: str | None = None
    compared = unreadable = 0

    for offer in offers:
        if _norm(offer.shop_name) in excluded:
            continue
        amount = parse_amount(offer.title)
        if not amount or offer.price <= 0:
            unreadable += 1
            continue
        unit = offer.price / amount
        compared += 1
        if best_unit is None or unit < best_unit:
            best_unit, best_shop = unit, offer.shop_name

    if best_unit is None:
        return Decision("skip", "no_readable_competitor", unreadable=unreadable)

    target = round(best_unit * rule.own_amount) - rule.undercut
    floored = target < rule.floor
    new_price = max(target, rule.floor)
    common = dict(competitor_shop=best_shop, competitor_unit=best_unit,
                  compared=compared, unreadable=unreadable)

    if new_price == rule.current_price:
        return Decision("skip", "unchanged", new_price, floored, **common)
    if new_price > rule.current_price and not rule.allow_raise:
        return Decision("skip", "would_raise", new_price, floored, **common)
    return Decision("update", "undercut", new_price, floored, **common)
