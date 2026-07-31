from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from uuid import UUID


class OrderStatus(StrEnum):
    PENDING = "pending"        # menunggu bot ber-stok
    PROCESSING = "processing"  # sedang dikirim oleh bot
    DONE = "done"              # terkirim penuh & terverifikasi
    PARTIAL = "partial"        # sebagian terkirim
    FAILED = "failed"          # gagal / tak ada bot ber-stok


@dataclass
class OrderItem:
    category: str
    item_key: str
    count: int


class OrderSource(StrEnum):
    """Dari mana order berasal — untuk memisahkan penjualan per kanal."""
    MANUAL = "manual"            # dibuat lewat form dashboard
    GOOGLE_SHEET = "google_sheet"
    VCGAMERS = "vcgamers"
    U7BUY = "u7buy"
    ITEMKU = "itemku"
    G2G = "g2g"
    ELDORADO = "eldorado"
    WEBSTORE = "webstore"


@dataclass
class Order:
    id: UUID
    recipient: str
    items: list[OrderItem]
    note: str = ""
    source: str = OrderSource.MANUAL.value
    status: OrderStatus = OrderStatus.PENDING
    assigned_bot: str | None = None
    sent_total: int = 0
    requested_total: int = 0
    error: str | None = None
    release_count: int = 0
    next_retry_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @property
    def total_requested(self) -> int:
        return sum(i.count for i in self.items)
