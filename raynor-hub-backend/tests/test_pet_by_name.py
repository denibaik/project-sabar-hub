"""Pet dipesan lewat NAMA, bukan UUID.

Tiap pet punya UUID unik, jadi order tak bisa menyebut ekor tertentu — pembeli
memesan "Raccoon", dan bot memilih ekornya saat mengirim.
"""
from app.main import owned_count, can_fulfill, PET_CATEGORY
from app.domain.orders.entities import OrderItem

INV = {
    "Pets": {
        "018b38d7-3341-490d-b42c-2532902556fc": 1,
        "cf8f5a53-1ea1-4fa8-a913-9ab3e140549e": 1,
        "2626de56-6c21-4b56-a983-bf2b068a20c4": 1,
    },
    "Seeds": {"Strawberry": 4},
}
NAMES = {
    "Pets": {
        "018b38d7-3341-490d-b42c-2532902556fc": "Raccoon",
        "cf8f5a53-1ea1-4fa8-a913-9ab3e140549e": "Frog",
        "2626de56-6c21-4b56-a983-bf2b068a20c4": "Raccoon",
    }
}


def test_counts_pets_by_name():
    assert owned_count(INV, NAMES, PET_CATEGORY, "Raccoon") == 2
    assert owned_count(INV, NAMES, PET_CATEGORY, "Frog") == 1
    assert owned_count(INV, NAMES, PET_CATEGORY, "Unicorn") == 0


def test_pet_name_match_is_case_and_space_insensitive():
    assert owned_count(INV, NAMES, PET_CATEGORY, "raccoon") == 2
    assert owned_count(INV, NAMES, PET_CATEGORY, "  Raccoon  ") == 2


def test_uuid_still_works_for_old_orders():
    assert owned_count(INV, NAMES, PET_CATEGORY, "cf8f5a53-1ea1-4fa8-a913-9ab3e140549e") == 1


def test_non_pet_categories_unaffected():
    assert owned_count(INV, NAMES, "Seeds", "Strawberry") == 4
    assert owned_count(INV, NAMES, "Seeds", "Carrot") == 0


def test_routing_uses_pet_names():
    cukup = [OrderItem("Pets", "Raccoon", 2)]
    kurang = [OrderItem("Pets", "Raccoon", 3)]
    assert can_fulfill(INV, cukup, NAMES) is True
    assert can_fulfill(INV, kurang, NAMES) is False, "hanya punya 2 Raccoon"


def test_without_names_pet_name_finds_nothing():
    """Tanpa peta nama, nama pet tak bisa dicocokkan — jangan sampai salah kirim."""
    assert owned_count(INV, {}, PET_CATEGORY, "Raccoon") == 0
    assert can_fulfill(INV, [OrderItem("Pets", "Raccoon", 1)], {}) is False
