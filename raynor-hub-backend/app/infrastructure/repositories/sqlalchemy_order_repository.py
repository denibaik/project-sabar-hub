from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.domain.orders.entities import Order, OrderItem, OrderStatus
from app.infrastructure.database.models.order import OrderModel, BotInventoryModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class SqlAlchemyOrderRepository:
    def __init__(self, db: Session):
        self.db = db

    def _to_entity(self, row: OrderModel) -> Order:
        items = [OrderItem(i["category"], i["item_key"], int(i["count"])) for i in (row.items or [])]
        return Order(
            row.id, row.recipient, items, row.note, OrderStatus(row.status), row.assigned_bot,
            row.sent_total, row.requested_total, row.error, row.release_count,
            row.next_retry_at, row.created_at, row.updated_at,
        )

    def create(self, order: Order) -> Order:
        row = OrderModel(
            id=order.id, recipient=order.recipient,
            items=[{"category": i.category, "item_key": i.item_key, "count": i.count} for i in order.items],
            note=order.note, status=order.status.value,
            requested_total=order.total_requested,
        )
        self.db.add(row); self.db.commit()
        return self._to_entity(self.db.get(OrderModel, order.id))

    def get(self, order_id: UUID) -> Order | None:
        row = self.db.get(OrderModel, order_id)
        return self._to_entity(row) if row else None

    def list(self) -> list[Order]:
        rows = self.db.scalars(select(OrderModel).order_by(OrderModel.created_at.desc())).all()
        return [self._to_entity(r) for r in rows]

    def list_claimable(self) -> list[Order]:
        now = _now()
        rows = self.db.scalars(
            select(OrderModel).where(OrderModel.status == "pending").order_by(OrderModel.created_at.asc())
        ).all()
        out = []
        for r in rows:
            nr = r.next_retry_at
            if nr is not None and nr.tzinfo is None:
                nr = nr.replace(tzinfo=timezone.utc)
            if nr is None or nr <= now:
                out.append(self._to_entity(r))
        return out

    def save(self, order: Order) -> Order:
        row = self.db.get(OrderModel, order.id)
        row.status = order.status.value
        row.assigned_bot = order.assigned_bot
        row.sent_total = order.sent_total
        row.requested_total = order.requested_total
        row.error = order.error
        row.release_count = order.release_count
        row.next_retry_at = order.next_retry_at
        row.updated_at = _now()
        self.db.commit()
        return self._to_entity(row)


class SqlAlchemyBotInventoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def upsert(self, bot_id: UUID, inventory: dict) -> None:
        row = self.db.get(BotInventoryModel, bot_id)
        if row is None:
            self.db.add(BotInventoryModel(bot_id=bot_id, inventory=inventory or {}))
        else:
            row.inventory = inventory or {}
            row.updated_at = _now()
        self.db.commit()

    def get(self, bot_id: UUID) -> dict:
        row = self.db.get(BotInventoryModel, bot_id)
        return (row.inventory or {}) if row else {}
