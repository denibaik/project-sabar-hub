"""Impor Google Sheet: dedup dan perlindungan dari pengiriman berulang."""
import http.server
import socketserver
import threading
from uuid import uuid4

from fastapi.testclient import TestClient
from app.main import app, sync_google_sheet
from app.domain.channels.entities import Channel, ChannelType
from app.infrastructure.database.session import SessionLocal
from app.infrastructure.repositories.sqlalchemy_channel_repository import SqlAlchemyChannelRepository

client = TestClient(app)
ADMIN = {"X-Admin-Key": "test-admin-key"}

CSV_CONTENT = {"data": ""}


class _Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        body = CSV_CONTENT["data"].encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/csv")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


def _serve():
    srv = socketserver.TCPServer(("127.0.0.1", 0), _Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}/orders.csv"


def _channel(url):
    db = SessionLocal()
    try:
        ch = Channel(uuid4(), ChannelType.GOOGLE_SHEET, "Sheet Test", config={"csv_url": url})
        return SqlAlchemyChannelRepository(db).create(ch)
    finally:
        db.close()


def _sync(ch):
    db = SessionLocal()
    try:
        fresh = SqlAlchemyChannelRepository(db).get(ch.id)
        return sync_google_sheet(db, fresh)
    finally:
        db.close()


def test_rows_are_imported_once_then_deduped():
    srv, url = _serve()
    try:
        CSV_CONTENT["data"] = (
            "recipient,category,item_key,count,order_ref\n"
            "buyerA,Seeds,Strawberry,1,REF-A\n"
            "buyerB,Trowels,Trowel,2,REF-B\n"
        )
        ch = _channel(url)

        first = _sync(ch)
        assert first["imported"] == 2, first
        assert first["skipped"] == 0

        # sync ulang dengan isi sama: tidak boleh membuat order baru
        second = _sync(ch)
        assert second["imported"] == 0, second
        assert second["skipped"] == 2
    finally:
        srv.shutdown()


def test_row_without_order_ref_is_refused_not_reimported():
    """Tanpa order_ref, sync berkala akan mengirim ulang terus — harus ditolak."""
    srv, url = _serve()
    try:
        CSV_CONTENT["data"] = (
            "recipient,category,item_key,count,order_ref\n"
            "buyerNoRef,Seeds,Strawberry,1,\n"
        )
        ch = _channel(url)

        first = _sync(ch)
        assert first["imported"] == 0, "baris tanpa order_ref tidak boleh diimpor"
        assert first["skipped"] == 1
        assert any("order_ref" in e for e in first["errors"]), first["errors"]

        # dijalankan berkali-kali pun tetap nol — inilah yang mencegah kirim berulang
        for _ in range(3):
            assert _sync(ch)["imported"] == 0
    finally:
        srv.shutdown()


def test_duplicate_ref_within_one_file_imported_once():
    srv, url = _serve()
    try:
        CSV_CONTENT["data"] = (
            "recipient,category,item_key,count,order_ref\n"
            "buyerC,Seeds,Strawberry,1,REF-DUP\n"
            "buyerC,Seeds,Strawberry,1,REF-DUP\n"
        )
        ch = _channel(url)
        result = _sync(ch)
        assert result["imported"] == 1, f"ref kembar dalam satu file harus sekali saja: {result}"
        assert result["skipped"] == 1
    finally:
        srv.shutdown()


def test_source_column_labels_the_real_origin():
    """Sheet sering cuma perantara — kolom `source` menyebut asal sebenarnya."""
    srv, url = _serve()
    try:
        CSV_CONTENT["data"] = (
            "recipient,category,item_key,count,order_ref,source\n"
            "buyerVC,Seeds,Strawberry,1,SRC-1,vcgamers\n"
            "buyerPlain,Seeds,Strawberry,1,SRC-2,\n"
        )
        ch = _channel(url)
        assert _sync(ch)["imported"] == 2

        rows = client.get("/api/v1/orders?page_size=50", headers=ADMIN).json()["items"]
        by_recipient = {o["recipient"]: o for o in rows}
        assert by_recipient["buyerVC"]["source"] == "vcgamers"
        assert by_recipient["buyerPlain"]["source"] == "google_sheet", "kosong → default sheet"
    finally:
        srv.shutdown()
