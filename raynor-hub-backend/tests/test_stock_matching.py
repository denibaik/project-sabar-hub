"""Order dari Google Sheet diketik manusia, jadi ejaannya tak pernah persis.

Sebelum ini pencocokan stok bersifat persis, sehingga "seeds" atau
"Dragon Breath" gagal dengan `no_bot_has_stock` walau barangnya ada.
"""
from app.main import canonical_item, owned_count, _kurang_apa

APOS = "Dragon's Breath"
INV = {
    "Seeds": {APOS: 12, "Star Fruit": 40},
    "WateringCans": {"Super Watering Can": 5},
    "Pets": {"11111111-2222-3333-4444-555555555555": 1},
}
NAMES = {"Pets": {"11111111-2222-3333-4444-555555555555": "Raccoon"}}


def test_ejaan_persis_tetap_jalan():
    assert owned_count(INV, NAMES, "Seeds", APOS) == 12


def test_kategori_beda_kapitalisasi():
    assert owned_count(INV, NAMES, "seeds", APOS) == 12
    assert owned_count(INV, NAMES, "wateringcans", "Super Watering Can") == 5


def test_item_beda_kapitalisasi_dan_tanda_baca():
    assert owned_count(INV, NAMES, "Seeds", "Star fruit") == 40
    assert owned_count(INV, NAMES, "Seeds", "Dragon Breath") == 12


def test_pet_dipesan_pakai_nama_longgar():
    assert owned_count(INV, NAMES, "pets", "raccoon") == 1


def test_item_yang_memang_tak_ada_tetap_nol():
    assert owned_count(INV, NAMES, "Seeds", "Lucky Block") == 0
    assert owned_count(INV, NAMES, "Gear", "Trowel") == 0


def test_tidak_menebak_saat_ambigu():
    """Dua kunci berbeda yang bentuk bakunya sama: jangan pilih salah satu.

    Mengirim barang yang salah lebih buruk daripada order gagal.
    """
    inv = {"Seeds": {"Sun Flower": 3, "Sunflower": 7}}
    assert owned_count(inv, {}, "Seeds", "Sun Flower") == 3   # persis menang
    assert owned_count(inv, {}, "Seeds", "SUNFLOWER!") == 0   # ambigu → menolak


def test_bot_menerima_ejaan_katalog():
    """Bot mencari item di game pakai kunci yang kita kirim."""
    assert canonical_item(INV, NAMES, "seeds", "Dragon Breath") == ("Seeds", APOS)
    assert canonical_item(INV, NAMES, "pets", "RACCOON") == ("Pets", "Raccoon")


def test_alasan_gagal_menyebut_item_dan_stok():
    pesan = _kurang_apa([(INV, NAMES)], [type("I", (), {"category": "Seeds", "item_key": "Lucky Block", "count": 2})()])
    assert "Seeds/Lucky Block" in pesan and "stok terbanyak 0" in pesan


def test_kata_jenis_di_belakang_nama_dimaklumi():
    """Listing marketplace menulis "Strawberry Seed"; katalog menyimpan "Strawberry".

    Ini persis order uji pertama yang menggantung `pending`.
    """
    inv = {"Seeds": {"Strawberry": 2, "Star Fruit": 3}}
    assert owned_count(inv, {}, "Seeds", "Strawberry Seed") == 2
    assert owned_count(inv, {}, "seeds", "strawberry seeds") == 2
    assert owned_count(inv, {}, "Seeds", "Star Fruit Seed") == 3
    assert canonical_item(inv, {}, "Seeds", "Strawberry Seed") == ("Seeds", "Strawberry")


def test_pet_boleh_ditulis_dengan_kata_pet():
    assert owned_count(INV, NAMES, "Pets", "Raccoon Pet") == 1


def test_kata_jenis_tidak_menciptakan_kecocokan_palsu():
    assert owned_count({"Seeds": {"Strawberry": 2}}, {}, "Seeds", "Lucky Seed") == 0
