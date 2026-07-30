from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from app.domain.orders.entities import OrderStatus


class OrderItemSchema(BaseModel):
    category: str = Field(min_length=1, max_length=64)
    item_key: str = Field(min_length=1, max_length=120)
    count: int = Field(ge=1, le=100000)


class CreateOrderRequest(BaseModel):
    recipient: str = Field(min_length=2, max_length=120)
    items: list[OrderItemSchema] = Field(min_length=1, max_length=50)
    note: str = ""


class OrderResponse(BaseModel):
    id: UUID
    recipient: str
    items: list[OrderItemSchema]
    note: str
    status: OrderStatus
    assigned_bot: str | None
    sent_total: int
    requested_total: int
    error: str | None
    created_at: datetime | None
    updated_at: datetime | None


class OrderListResponse(BaseModel):
    items: list[OrderResponse]
    total: int


class ClaimRequest(BaseModel):
    # bot boleh mengirim snapshot inventory terbaru (paling fresh untuk routing)
    inventory: dict[str, dict[str, int]] | None = None


class ResultRequest(BaseModel):
    order_id: UUID
    status: str = Field(pattern="^(fulfilled|partial|failed|released)$")
    sent_total: int = Field(default=0, ge=0)
    requested_total: int = Field(default=0, ge=0)
    error: str | None = None


class AvailableItem(BaseModel):
    category: str
    item_key: str
    total: int          # total unit tersedia di semua bot online
    bots: list[str]     # username bot yang menyimpannya


class ItemsResponse(BaseModel):
    items: list[AvailableItem]
    total: int          # jumlah jenis item distinct
