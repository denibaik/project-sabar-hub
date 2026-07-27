from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from app.domain.bots.entities import BotStatus

class RegisterBotRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    username: str = Field(min_length=2, max_length=120)
    game: str = Field(min_length=2, max_length=120)
class BotHeartbeatRequest(BaseModel):
    server: str | None = None
    ping_ms: int | None = Field(default=None, ge=0, le=10000)
class BotResponse(BaseModel):
    id: UUID; name: str; username: str; game: str; status: BotStatus; last_heartbeat_at: datetime | None; server: str | None; ping_ms: int | None
class RegisterBotResponse(BaseModel):
    bot: BotResponse
    token: str
class BotListResponse(BaseModel):
    items: list[BotResponse]
    total: int
