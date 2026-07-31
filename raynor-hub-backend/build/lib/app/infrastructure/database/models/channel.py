from datetime import datetime, timezone
from uuid import UUID, uuid4
from sqlalchemy import Boolean, DateTime, String, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.infrastructure.database.session import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ChannelModel(Base):
    __tablename__ = "channels"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    type: Mapped[str] = mapped_column(String(30), index=True)
    name: Mapped[str] = mapped_column(String(120))
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(30), default="disconnected")
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
