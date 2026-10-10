from app.domain.pricing import Offer, Rule, decide, parse_amount


def rule(**kw):
    base = dict(own_shop="RaynorStore", own_amount=1_000_000, current_price=20_000,
                floor=10_000, undercut=100)
    base.update(kw)
    return Rule(**base)


# ---- parse_amount ---------------------------------------------------------

def test_parse_amount_cases():
    cases = [
        ("Grow a Garden 2 - 1M Sheckles", 1_000_000),
        ("500K Sheckles Murah", 500_000),
        ("150x Trowel GAG2", 150),
        ("Trowel x150 Grow a Garden", 150),
        ("Sheckles 1.000.000 Fast Delivery", 1_000_000),
        ("1,5jt Sheckles", 1_500_000),
        ("2rb Sheckles", 2_000),
        ("Rainbow Seed Rp 15.000", None),        # hanya harga
        ("Sheckles 1M - Rp 15.000", 1_000_000),  # harga diabaikan
        ("Grow a Garden 2 Sheckles", None),      # angka 2 = nama game
        ("1M Sheckles + 500K Bonus", None),      # dua jumlah, ambigu
        ("", None),
        (None, None),
    ]
    for title, expected in cases:
        assert parse_amount(title) == expected, title


# ---- decide ---------------------------------------------------------------

def test_undercuts_cheapest_by_unit_price():
    offers = [
        Offer("ShopA", "1M Sheckles", 15_000),     # 0.015/unit
        Offer("ShopB", "500K Sheckles", 6_000),    # 0.012/unit  <- termurah
        Offer("ShopC", "2M Sheckles", 40_000),     # 0.020/unit
    ]
    d = decide(rule(), offers)
    assert d.action == "update"
    assert d.competitor_shop == "ShopB"
    assert d.new_price == 12_000 - 100
    assert d.compared == 3 and d.unreadable == 0


def test_never_goes_below_floor():
    offers = [Offer("ShopA", "1M Sheckles", 5_000)]
    d = decide(rule(floor=10_000), offers)
    assert d.action == "update"
    assert d.new_price == 10_000 and d.floored is True


def test_no_floor_is_not_touched():
    d = decide(rule(floor=0), [Offer("ShopA", "1M Sheckles", 5_000)])
    assert (d.action, d.reason) == ("skip", "no_floor")


def test_own_shop_is_excluded_case_insensitive():
    offers = [Offer("  raynorstore ", "1M Sheckles", 1_000),   # toko sendiri
              Offer("ShopA", "1M Sheckles", 15_000)]
    d = decide(rule(), offers)
    assert d.competitor_shop == "ShopA"


def test_blacklisted_shop_is_ignored():
    offers = [Offer("Spammer", "1M Sheckles", 1_000),
              Offer("ShopA", "1M Sheckles", 15_000)]
    d = decide(rule(blacklist=frozenset({"spammer"})), offers)
    assert d.competitor_shop == "ShopA"
    assert d.compared == 1


def test_unreadable_amount_is_skipped_not_guessed():
    offers = [Offer("ShopA", "Sheckles murah banget", 1_000),
              Offer("ShopB", "1M Sheckles", 15_000)]
    d = decide(rule(), offers)
    assert d.competitor_shop == "ShopB"
    assert d.unreadable == 1 and d.compared == 1


def test_no_readable_competitor_means_skip():
    d = decide(rule(), [Offer("ShopA", "Sheckles murah", 1_000)])
    assert (d.action, d.reason) == ("skip", "no_readable_competitor")
    assert d.new_price is None and d.unreadable == 1


def test_empty_market_means_skip():
    d = decide(rule(), [])
    assert (d.action, d.reason) == ("skip", "no_readable_competitor")


def test_unchanged_price_is_skipped():
    d = decide(rule(current_price=14_900), [Offer("ShopA", "1M Sheckles", 15_000)])
    assert (d.action, d.reason) == ("skip", "unchanged")


def test_does_not_raise_price_unless_allowed():
    offers = [Offer("ShopA", "1M Sheckles", 30_000)]
    d = decide(rule(current_price=20_000), offers)
    assert (d.action, d.reason) == ("skip", "would_raise")
    d2 = decide(rule(current_price=20_000, allow_raise=True), offers)
    assert d2.action == "update" and d2.new_price == 29_900


def test_invalid_own_amount_is_skipped():
    d = decide(rule(own_amount=0), [Offer("ShopA", "1M Sheckles", 15_000)])
    assert (d.action, d.reason) == ("skip", "invalid_own_amount")


def test_non_positive_price_is_unreadable():
    d = decide(rule(), [Offer("ShopA", "1M Sheckles", 0)])
    assert d.reason == "no_readable_competitor" and d.unreadable == 1
