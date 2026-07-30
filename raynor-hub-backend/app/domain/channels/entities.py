from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from uuid import UUID


class ChannelType(StrEnum):
    ITEMKU = "itemku"
    G2G = "g2g"
    ELDORADO = "eldorado"
    U7BUY = "u7buy"
    VCGAMERS = "vcgamers"
    WEBSTORE = "webstore"
    GOOGLE_SHEET = "google_sheet"


class ChannelStatus(StrEnum):
    DISCONNECTED = "disconnected"
    CONNECTED = "connected"
    ERROR = "error"
    SYNCING = "syncing"


@dataclass
class Channel:
    id: UUID
    type: ChannelType
    name: str
    enabled: bool = False
    status: ChannelStatus = ChannelStatus.DISCONNECTED
    config: dict = field(default_factory=dict)
    last_synced_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
