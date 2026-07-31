from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.domain.channels.entities import Channel, ChannelStatus, ChannelType
from app.infrastructure.database.models.channel import ChannelModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class SqlAlchemyChannelRepository:
    def __init__(self, db: Session):
        self.db = db

    def _to_entity(self, row: ChannelModel) -> Channel:
        return Channel(
            row.id, ChannelType(row.type), row.name, row.enabled, ChannelStatus(row.status),
            row.config or {}, row.last_synced_at, row.created_at, row.updated_at,
        )

    def create(self, ch: Channel) -> Channel:
        self.db.add(ChannelModel(
            id=ch.id, type=ch.type.value, name=ch.name, enabled=ch.enabled,
            status=ch.status.value, config=ch.config,
        ))
        self.db.commit()
        return self._to_entity(self.db.get(ChannelModel, ch.id))

    def get(self, cid: UUID) -> Channel | None:
        row = self.db.get(ChannelModel, cid)
        return self._to_entity(row) if row else None

    def list(self) -> list[Channel]:
        rows = self.db.scalars(select(ChannelModel).order_by(ChannelModel.created_at.asc())).all()
        return [self._to_entity(r) for r in rows]

    def save(self, ch: Channel) -> Channel:
        row = self.db.get(ChannelModel, ch.id)
        row.name = ch.name
        row.enabled = ch.enabled
        row.status = ch.status.value
        row.config = ch.config
        row.last_synced_at = ch.last_synced_at
        row.updated_at = _now()
        self.db.commit()
        return self._to_entity(row)

    def delete(self, cid: UUID) -> bool:
        row = self.db.get(ChannelModel, cid)
        if not row:
            return False
        self.db.delete(row)
        self.db.commit()
        return True
