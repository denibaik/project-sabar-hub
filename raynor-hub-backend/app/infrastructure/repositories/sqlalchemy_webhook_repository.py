from __future__ import annotations
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.infrastructure.database.models.webhook_event import WebhookEventModel


class SqlAlchemyWebhookRepository:
    def __init__(self, db: Session):
        self.db = db

    def record(self, source: str, event: str, dedupe_key: str, payload: str) -> tuple[WebhookEventModel, bool]:
        """Simpan event. Mengembalikan (baris, apakah_baru).

        Kalau dedupe_key sudah ada (U7Buy mengulang kiriman), kembalikan baris
        lama dengan is_new=False supaya tidak diproses dua kali.
        """
        existing = self.db.scalar(
            select(WebhookEventModel).where(
                WebhookEventModel.source == source,
                WebhookEventModel.dedupe_key == dedupe_key,
            )
        )
        if existing:
            return existing, False

        row = WebhookEventModel(
            id=uuid4(), source=source, event=event, dedupe_key=dedupe_key, payload=payload
        )
        self.db.add(row)
        try:
            self.db.commit()
        except IntegrityError:
            # balapan: kiriman ulang tiba bersamaan
            self.db.rollback()
            again = self.db.scalar(
                select(WebhookEventModel).where(
                    WebhookEventModel.source == source,
                    WebhookEventModel.dedupe_key == dedupe_key,
                )
            )
            if again:
                return again, False
            raise
        return row, True

    def pending(self, source: str | None = None, limit: int = 50) -> list[WebhookEventModel]:
        stmt = select(WebhookEventModel).where(WebhookEventModel.status == "received")
        if source:
            stmt = stmt.where(WebhookEventModel.source == source)
        return list(self.db.scalars(stmt.order_by(WebhookEventModel.received_at.asc()).limit(limit)).all())

    def mark(self, row: WebhookEventModel, status: str, error: str | None = None) -> None:
        row.status = status
        row.error = error
        row.processed_at = datetime.now(timezone.utc)
        self.db.commit()

    def recent(self, limit: int = 50) -> list[WebhookEventModel]:
        return list(
            self.db.scalars(
                select(WebhookEventModel).order_by(WebhookEventModel.received_at.desc()).limit(limit)
            ).all()
        )
