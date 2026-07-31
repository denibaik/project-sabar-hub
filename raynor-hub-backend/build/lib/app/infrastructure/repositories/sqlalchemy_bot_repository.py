from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.domain.bots.entities import Bot, BotStatus
from app.infrastructure.database.models.bot import BotModel

class SqlAlchemyBotRepository:
    def __init__(self, db: Session): self.db = db
    def _to_entity(self, row: BotModel) -> Bot:
        return Bot(row.id, row.name, row.username, row.game, BotStatus(row.status), row.last_heartbeat_at, row.server, row.ping_ms)
    def create(self, bot: Bot, token_hash: str, token_prefix: str | None = None) -> Bot:
        self.db.add(BotModel(id=bot.id, name=bot.name, username=bot.username, game=bot.game,
                             status=bot.status.value, token_hash=token_hash, token_prefix=token_prefix))
        self.db.commit(); return bot
    def find_by_prefix(self, prefix: str):
        """Jalur cepat: baris yang prefix token-nya cocok (biasanya tepat satu)."""
        rows = self.db.scalars(select(BotModel).where(BotModel.token_prefix == prefix)).all()
        return [(self._to_entity(r), r.token_hash) for r in rows]
    def legacy_candidates(self):
        """Baris lama yang belum punya prefix — hanya ini yang perlu dipindai."""
        rows = self.db.scalars(select(BotModel).where(BotModel.token_prefix.is_(None))).all()
        return [(self._to_entity(r), r.token_hash) for r in rows]
    def backfill_prefix(self, bot_id: UUID, prefix: str) -> None:
        row = self.db.get(BotModel, bot_id)
        if row and not row.token_prefix:
            row.token_prefix = prefix; self.db.commit()
    def get(self, bot_id: UUID):
        row = self.db.get(BotModel, bot_id); return (self._to_entity(row), row.token_hash) if row else None
    def find_by_username(self, username: str) -> bool:
        return self.db.scalar(select(BotModel.id).where(BotModel.username == username)) is not None
    def find_by_token_candidates(self):
        return [(self._to_entity(row), row.token_hash) for row in self.db.scalars(select(BotModel)).all()]
    def list(self): return [self._to_entity(row) for row in self.db.scalars(select(BotModel)).all()]
    def delete(self, bot_id: UUID) -> bool:
        row = self.db.get(BotModel, bot_id)
        if not row: return False
        self.db.delete(row); self.db.commit(); return True
    def save(self, bot: Bot) -> Bot:
        row = self.db.get(BotModel, bot.id)
        row.status, row.last_heartbeat_at, row.server, row.ping_ms, row.updated_at = bot.status.value, bot.last_heartbeat_at, bot.server, bot.ping_ms, datetime.now(timezone.utc)
        self.db.commit(); return bot
