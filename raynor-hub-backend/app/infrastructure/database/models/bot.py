from datetime import datetime, timezone
from uuid import UUID, uuid4
from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.infrastructure.database.session import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

class BotModel(Base):
    __tablename__ = "bots"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(120))
    username: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    game: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(30), default="offline", index=True)
    token_hash: Mapped[str] = mapped_column(String(255))
    # Bagian depan token, ber-index. Mempersempit pencarian agar argon2 cukup
    # dijalankan sekali. Nullable demi baris lama (diisi otomatis saat auth pertama).
    token_prefix: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    last_heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    server: Mapped[str | None] = mapped_column(String(120), nullable=True)
    ping_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
