from datetime import datetime, timezone
from uuid import UUID, uuid4
from sqlalchemy import DateTime, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.infrastructure.database.session import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class OrderModel(Base):
    __tablename__ = "orders"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    recipient: Mapped[str] = mapped_column(String(120), index=True)
    items: Mapped[list] = mapped_column(JSON, default=list)  # [{category, item_key, count}]
    note: Mapped[str] = mapped_column(String(300), default="")
    source: Mapped[str] = mapped_column(String(30), default="manual", index=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    assigned_bot: Mapped[str | None] = mapped_column(String(120), nullable=True)
    sent_total: Mapped[int] = mapped_column(Integer, default=0)
    requested_total: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    release_count: Mapped[int] = mapped_column(Integer, default=0)
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class BotInventoryModel(Base):
    __tablename__ = "bot_inventories"
    bot_id: Mapped[UUID] = mapped_column(primary_key=True)
    inventory: Mapped[dict] = mapped_column(JSON, default=dict)  # {category: {item_key: count}}
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
