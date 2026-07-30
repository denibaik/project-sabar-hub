from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4
from fastapi import Depends, FastAPI, Header, HTTPException, Response
from fastapi.responses import PlainTextResponse
from pathlib import Path as _Path
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.config import settings
from app.domain.bots.entities import Bot, BotStatus
from app.domain.orders.entities import Order, OrderItem, OrderStatus
from app.infrastructure.database.session import Base, engine, get_db

from app.infrastructure.repositories.sqlalchemy_bot_repository import SqlAlchemyBotRepository
from app.infrastructure.repositories.sqlalchemy_order_repository import (
    SqlAlchemyOrderRepository, SqlAlchemyBotInventoryRepository,
)
from app.infrastructure.security.token_hasher import generate_token, hash_token, verify_token
from app.api.v1.schemas.bots import BotHeartbeatRequest, BotListResponse, BotResponse, RegisterBotRequest, RegisterBotResponse
from app.api.v1.schemas.orders import (
    CreateOrderRequest, OrderResponse, OrderListResponse, ClaimRequest, ResultRequest,
    AvailableItem, ItemsResponse,
)
from app.domain.channels.entities import Channel, ChannelStatus, ChannelType
from app.infrastructure.repositories.sqlalchemy_channel_repository import SqlAlchemyChannelRepository
from app.api.v1.schemas.channels import (
    CreateChannelRequest, UpdateChannelRequest, ChannelResponse, ChannelListResponse, SyncResult,
)
import csv as _csv
import io as _io
import urllib.request as _urlreq

Base.metadata.create_all(bind=engine)
app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def response(bot: Bot) -> BotResponse: return BotResponse(id=bot.id, name=bot.name, username=bot.username, game=bot.game, status=bot.status, last_heartbeat_at=bot.last_heartbeat_at, server=bot.server, ping_ms=bot.ping_ms)

def require_registration_key(key: str | None = Header(default=None, alias="X-Registration-Key")):
    if key != settings.bot_registration_key: raise HTTPException(status_code=401, detail="Invalid registration key")

def authenticate_bot(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "): raise HTTPException(status_code=401, detail="Bearer token required")
    return authorization.removeprefix("Bearer ").strip()

def resolve_bot(db: Session, token: str) -> Bot:
    repo = SqlAlchemyBotRepository(db)
    match = next(((bot, stored) for bot, stored in repo.find_by_token_candidates() if verify_token(token, stored)), None)
    if not match: raise HTTPException(status_code=401, detail="Invalid bot token")
    return match[0]

def _aware(dt):
    return dt.replace(tzinfo=timezone.utc) if (dt is not None and dt.tzinfo is None) else dt

def bot_is_online(bot: Bot) -> bool:
    hb = _aware(bot.last_heartbeat_at)
    return hb is not None and (datetime.now(timezone.utc) - hb).total_seconds() <= settings.heartbeat_timeout_seconds

def can_fulfill(inventory: dict, items) -> bool:
    for it in items:
        have = (inventory.get(it.category) or {}).get(it.item_key, 0)
        if have < it.count: return False
    return True

def order_response(o: Order) -> OrderResponse:
    return OrderResponse(
        id=o.id, recipient=o.recipient,
        items=[{"category": i.category, "item_key": i.item_key, "count": i.count} for i in o.items],
        note=o.note, status=o.status, assigned_bot=o.assigned_bot,
        sent_total=o.sent_total, requested_total=o.requested_total, error=o.error,
        created_at=o.created_at, updated_at=o.updated_at,
    )

@app.get("/health")
def health(): return {"status": "ok", "service": settings.app_name}

@app.post("/api/v1/bots", response_model=RegisterBotResponse, status_code=201, dependencies=[Depends(require_registration_key)])
def register_bot(payload: RegisterBotRequest, db: Session = Depends(get_db)):
    repo = SqlAlchemyBotRepository(db)
    if repo.find_by_username(payload.username): raise HTTPException(status_code=409, detail="Bot username already exists")
    token = generate_token(); bot = Bot(uuid4(), payload.name, payload.username, payload.game)
    repo.create(bot, hash_token(token))
    return {"bot": response(bot), "token": token}

@app.post("/api/v1/bots/heartbeat", response_model=BotResponse)
def heartbeat(payload: BotHeartbeatRequest, token: str = Depends(authenticate_bot), db: Session = Depends(get_db)):
    repo = SqlAlchemyBotRepository(db)
    match = next(((bot, stored) for bot, stored in repo.find_by_token_candidates() if verify_token(token, stored)), None)
    if not match: raise HTTPException(status_code=401, detail="Invalid bot token")
    bot, _ = match; bot.status = BotStatus.ONLINE; bot.last_heartbeat_at = datetime.now(timezone.utc); bot.server = payload.server; bot.ping_ms = payload.ping_ms
    if payload.inventory is not None:
        SqlAlchemyBotInventoryRepository(db).upsert(bot.id, payload.inventory)
    return response(repo.save(bot))

@app.get("/api/v1/bots", response_model=BotListResponse)
def list_bots(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc); items = []
    for bot in SqlAlchemyBotRepository(db).list():
        hb = _aware(bot.last_heartbeat_at)
        if hb and (now - hb).total_seconds() > settings.heartbeat_timeout_seconds: bot.status = BotStatus.OFFLINE
        items.append(response(bot))
    return {"items": items, "total": len(items)}


# ============================ ORDERS / AUTO-SEND ============================

@app.post("/api/v1/orders", response_model=OrderResponse, status_code=201, dependencies=[Depends(require_registration_key)])
def create_order(payload: CreateOrderRequest, db: Session = Depends(get_db)):
    items = [OrderItem(i.category, i.item_key, i.count) for i in payload.items]
    order = Order(uuid4(), payload.recipient.strip(), items, payload.note or "")
    return order_response(SqlAlchemyOrderRepository(db).create(order))


@app.get("/api/v1/orders", response_model=OrderListResponse)
def list_orders(db: Session = Depends(get_db)):
    items = [order_response(o) for o in SqlAlchemyOrderRepository(db).list()]
    return {"items": items, "total": len(items)}


@app.get("/api/v1/items", response_model=ItemsResponse)
def list_items(db: Session = Depends(get_db)):
    # agregasi stok dari semua bot ONLINE (sumber routing yang sama)
    bot_repo = SqlAlchemyBotRepository(db)
    inv_repo = SqlAlchemyBotInventoryRepository(db)
    agg: dict[tuple[str, str], dict] = {}
    for bot in bot_repo.list():
        if not bot_is_online(bot):
            continue
        inv = inv_repo.get(bot.id) or {}
        for cat, items in inv.items():
            for key, count in (items or {}).items():
                c = 1 if isinstance(count, dict) else int(count or 0)
                if c <= 0:
                    continue
                e = agg.setdefault((cat, key), {"total": 0, "bots": set()})
                e["total"] += c
                e["bots"].add(bot.username)
    result = [
        AvailableItem(category=c, item_key=k, total=v["total"], bots=sorted(v["bots"]))
        for (c, k), v in sorted(agg.items())
    ]
    return {"items": result, "total": len(result)}


@app.post("/api/v1/bots/claim")
def claim_order(payload: ClaimRequest, response: Response, token: str = Depends(authenticate_bot), db: Session = Depends(get_db)):
    bot = resolve_bot(db, token)
    inv_repo = SqlAlchemyBotInventoryRepository(db)
    inventory = payload.inventory if payload.inventory is not None else inv_repo.get(bot.id)
    if payload.inventory is not None:
        inv_repo.upsert(bot.id, payload.inventory)  # simpan yang terbaru
    orders = SqlAlchemyOrderRepository(db)
    for order in orders.list_claimable():
        if can_fulfill(inventory, order.items):
            order.status = OrderStatus.PROCESSING
            order.assigned_bot = bot.username
            orders.save(order)
            return order_response(order)
    response.status_code = 204  # tak ada order yang bisa dipenuhi bot ini
    return None


@app.post("/api/v1/bots/result", response_model=OrderResponse)
def report_result(payload: ResultRequest, token: str = Depends(authenticate_bot), db: Session = Depends(get_db)):
    bot = resolve_bot(db, token)
    orders = SqlAlchemyOrderRepository(db)
    order = orders.get(payload.order_id)
    if not order: raise HTTPException(status_code=404, detail="Order not found")
    order.sent_total = payload.sent_total
    order.requested_total = payload.requested_total or order.requested_total
    if payload.status == "released":
        order.assigned_bot = None
        order.release_count += 1
        if order.release_count >= settings.order_max_release:
            order.status = OrderStatus.FAILED
            order.error = (payload.error or "released") + " (giveup: tak ada bot ber-stok)"
        else:
            order.status = OrderStatus.PENDING
            order.next_retry_at = datetime.now(timezone.utc) + timedelta(seconds=settings.order_retry_delay_seconds)
    else:
        order.status = {"fulfilled": OrderStatus.DONE, "partial": OrderStatus.PARTIAL, "failed": OrderStatus.FAILED}.get(payload.status, OrderStatus.FAILED)
        order.error = payload.error
    return order_response(orders.save(order))


# ============================ MARKETPLACE CHANNELS ============================

def channel_response(c: Channel) -> ChannelResponse:
    return ChannelResponse(
        id=c.id, type=c.type, name=c.name, enabled=c.enabled, status=c.status,
        config=c.config, last_synced_at=c.last_synced_at,
        created_at=c.created_at, updated_at=c.updated_at,
    )


@app.get("/api/v1/channels", response_model=ChannelListResponse)
def list_channels(db: Session = Depends(get_db)):
    items = [channel_response(c) for c in SqlAlchemyChannelRepository(db).list()]
    return {"items": items, "total": len(items)}


@app.post("/api/v1/channels", response_model=ChannelResponse, status_code=201, dependencies=[Depends(require_registration_key)])
def create_channel(payload: CreateChannelRequest, db: Session = Depends(get_db)):
    ch = Channel(uuid4(), payload.type, payload.name.strip(), config=payload.config or {})
    return channel_response(SqlAlchemyChannelRepository(db).create(ch))


@app.patch("/api/v1/channels/{channel_id}", response_model=ChannelResponse, dependencies=[Depends(require_registration_key)])
def update_channel(channel_id: UUID, payload: UpdateChannelRequest, db: Session = Depends(get_db)):
    repo = SqlAlchemyChannelRepository(db)
    ch = repo.get(channel_id)
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")
    if payload.name is not None:
        ch.name = payload.name.strip()
    if payload.enabled is not None:
        ch.enabled = payload.enabled
        ch.status = ChannelStatus.CONNECTED if payload.enabled else ChannelStatus.DISCONNECTED
    if payload.config is not None:
        ch.config = {**ch.config, **payload.config}
    return channel_response(repo.save(ch))


@app.delete("/api/v1/channels/{channel_id}", status_code=204, dependencies=[Depends(require_registration_key)])
def delete_channel(channel_id: UUID, db: Session = Depends(get_db)):
    if not SqlAlchemyChannelRepository(db).delete(channel_id):
        raise HTTPException(status_code=404, detail="Channel not found")
    return None


@app.post("/api/v1/channels/{channel_id}/sync", response_model=SyncResult, dependencies=[Depends(require_registration_key)])
def sync_channel(channel_id: UUID, db: Session = Depends(get_db)):
    repo = SqlAlchemyChannelRepository(db)
    ch = repo.get(channel_id)
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")
    if ch.type != ChannelType.GOOGLE_SHEET:
        raise HTTPException(status_code=400, detail="Sync hanya untuk channel google_sheet")

    url = (ch.config or {}).get("csv_url", "").strip()
    if not url:
        return {"imported": 0, "skipped": 0, "errors": ["csv_url belum diisi di config"]}

    # Google Sheet: File → Share → Publish to web → CSV. URL publik, tanpa auth.
    try:
        with _urlreq.urlopen(url, timeout=15) as resp:
            text = resp.read().decode("utf-8", errors="replace")
    except Exception as e:  # noqa: BLE001
        ch.status = ChannelStatus.ERROR
        repo.save(ch)
        return {"imported": 0, "skipped": 0, "errors": [f"gagal fetch CSV: {e}"]}

    orders = SqlAlchemyOrderRepository(db)
    imported_refs = set(ch.config.get("imported_refs", []))
    imported, skipped, errors, new_refs = 0, 0, [], []
    reader = _csv.DictReader(_io.StringIO(text))
    for i, row in enumerate(reader, start=2):
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        recipient = row.get("recipient") or row.get("username")
        category = row.get("category")
        item_key = row.get("item_key") or row.get("item")
        ref = row.get("order_ref") or row.get("ref") or ""
        try:
            count = max(1, int(row.get("count") or row.get("qty") or "1"))
        except ValueError:
            count = 1
        if not (recipient and category and item_key):
            continue
        if ref and ref in imported_refs:
            skipped += 1
            continue
        try:
            order = Order(uuid4(), recipient, [OrderItem(category, item_key, count)], note=f"gsheet:{ref}" if ref else "gsheet")
            orders.create(order)
            imported += 1
            if ref:
                new_refs.append(ref)
        except Exception as e:  # noqa: BLE001
            errors.append(f"baris {i}: {e}")

    ch.config = {**ch.config, "imported_refs": list(imported_refs) + new_refs}
    ch.last_synced_at = datetime.now(timezone.utc)
    ch.status = ChannelStatus.CONNECTED
    repo.save(ch)
    return {"imported": imported, "skipped": skipped, "errors": errors}


# ============================ LOADER (untuk loadstring(game:HttpGet(...))()) ============================

_SCRIPT_PATH = _Path(__file__).resolve().parent.parent.parent / "raynor-hub-frontend" / "public" / "RaynorHubBot.lua"


@app.get("/files/loader.lua", response_class=PlainTextResponse)
def get_loader_script():
    if not _SCRIPT_PATH.exists():
        raise HTTPException(status_code=404, detail="Script belum ada di public/RaynorHubBot.lua")
    return PlainTextResponse(_SCRIPT_PATH.read_text(encoding="utf-8"), media_type="text/plain")
