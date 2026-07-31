"""Paginasi order + pelacakan sumber."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
ADMIN = {"X-Admin-Key": "test-admin-key"}


def _buat(recipient, source=None):
    body = {"recipient": recipient,
            "items": [{"category": "Seeds", "item_key": "Strawberry", "count": 1}]}
    if source:
        body["source"] = source
    r = client.post("/api/v1/orders", headers=ADMIN, json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_source_defaults_to_manual_and_is_stored():
    assert _buat("orangA")["source"] == "manual"
    assert _buat("orangB", "vcgamers")["source"] == "vcgamers"
    assert _buat("orangC", "VCGamers")["source"] == "vcgamers", "harus dinormalisasi ke huruf kecil"


def test_pagination_splits_results_and_reports_totals():
    for i in range(12):
        _buat(f"paging{i}")

    hal1 = client.get("/api/v1/orders?page=1&page_size=10", headers=ADMIN).json()
    assert len(hal1["items"]) == 10
    assert hal1["page"] == 1
    assert hal1["total"] >= 12
    assert hal1["total_pages"] >= 2

    hal2 = client.get("/api/v1/orders?page=2&page_size=10", headers=ADMIN).json()
    assert hal2["page"] == 2
    assert hal2["items"], "halaman 2 harus ada isinya"

    id1 = {o["id"] for o in hal1["items"]}
    id2 = {o["id"] for o in hal2["items"]}
    assert not (id1 & id2), "halaman tidak boleh tumpang tindih"


def test_summary_counts_cover_all_orders_not_just_page():
    hal = client.get("/api/v1/orders?page=1&page_size=2", headers=ADMIN).json()
    assert len(hal["items"]) == 2
    total_counts = sum(hal["counts"].values())
    assert total_counts == hal["total"], "kartu ringkasan harus menghitung semua order"
    assert sum(hal["sources"].values()) == hal["total"]


def test_filter_by_source():
    _buat("khususSheet", "google_sheet")
    hasil = client.get("/api/v1/orders?source=google_sheet&page_size=50", headers=ADMIN).json()
    assert hasil["items"], "harus ada order google_sheet"
    assert all(o["source"] == "google_sheet" for o in hasil["items"])
