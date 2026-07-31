from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID

class BotStatus(StrEnum):
    OFFLINE = "offline"
    ONLINE = "online"
    MAINTENANCE = "maintenance"

@dataclass
class Bot:
    id: UUID
    name: str
    username: str
    game: str
    status: BotStatus = BotStatus.OFFLINE
    last_heartbeat_at: datetime | None = None
    server: str | None = None
    ping_ms: int | None = None
