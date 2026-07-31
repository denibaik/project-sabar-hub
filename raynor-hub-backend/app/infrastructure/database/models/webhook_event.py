from datetime import datetime, timezone
from uuid import UUID, uuid4
from sqlalchemy import DateTime, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.infrastructure.database.session import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class WebhookEventModel(Base):
    """Event webhook yang diterima, disimpan mentah sebelum diproses.

    U7Buy menunggu balasan maksimal 5 detik dan mengulang sampai 5×. Jadi kita
    simpan cepat lalu balas OK; pemrosesan berat (ambil detail order, buat order)
    dilakukan terpisah. `dedupe_key` mencegah pengulangan menghasilkan order ganda.
    """

    __tablename__ = "webhook_events"
    __table_args__ = (UniqueConstraint("source", "dedupe_key", name="uq_webhook_source_dedupe"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    source: Mapped[str] = mapped_column(String(30), index=True)          # mis. "u7buy"
    event: Mapped[str] = mapped_column(String(60), index=True)           # mis. "new_order_received"
    dedupe_key: Mapped[str] = mapped_column(String(120))                 # mis. "new_order_received:196643..."
    payload: Mapped[str] = mapped_column(Text)                           # body mentah
    status: Mapped[str] = mapped_column(String(20), default="received", index=True)  # received|processed|failed
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
