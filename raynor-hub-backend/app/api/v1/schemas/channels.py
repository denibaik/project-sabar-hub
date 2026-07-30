from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from app.domain.channels.entities import ChannelStatus, ChannelType


class CreateChannelRequest(BaseModel):
    type: ChannelType
    name: str = Field(min_length=2, max_length=120)
    config: dict = {}


class UpdateChannelRequest(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    enabled: bool | None = None
    config: dict | None = None


class ChannelResponse(BaseModel):
    id: UUID
    type: ChannelType
    name: str
    enabled: bool
    status: ChannelStatus
    config: dict
    last_synced_at: datetime | None
    created_at: datetime | None
    updated_at: datetime | None


class ChannelListResponse(BaseModel):
    items: list[ChannelResponse]
    total: int


class SyncResult(BaseModel):
    imported: int
    skipped: int
    errors: list[str]
