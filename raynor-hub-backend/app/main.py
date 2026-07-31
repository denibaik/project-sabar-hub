from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse, PlainTextResponse
from pathlib import Path as _Path
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.config import settings
from app.domain.bots.entities import Bot, BotStatus
from app.domain.orders.entities import Order, OrderItem, OrderStatus
from app.infrastructure.database.session import Base, engine, ensure_columns, get_db

from app.infrastructure.repositories.sqlalchemy_bot_repository import SqlAlchemyBotRepository
from app.infrastructure.repositories.sqlalchemy_order_repository import (
    SqlAlchemyOrderRepository, SqlAlchemyBotInventoryRepository,
)
from app.infrastructure.repositories.sqlalchemy_webhook_repository import SqlAlchemyWebhookRepository
from app.infrastructure.security.rate_limit import limiter
from app.infrastructure.security.u7buy_signature import verify as verify_u7buy, debug_candidates as debug_u7buy
from app.infrastructure.security.token_hasher import generate_token, hash_token, verify_token, token_prefix
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
import asyncio
import hmac
import re
import json
from contextlib import asynccontextmanager
import csv as _csv
import io as _io
import urllib.request as _urlreq

Base.metadata.create_all(bind=engine)
ensure_columns()  # tambah kolom baru pada DB lama (sampai Alembic dipasang)
async def _periodic(label: str, interval: int, fn):
    """Jalankan `fn(db)` tiap `interval` detik. Error dicatat, tidak mematikan app."""
    from app.infrastructure.database.session import SessionLocal
    while True:
        await asyncio.sleep(interval)
        db = SessionLocal()
        try:
            n = await asyncio.to_thread(fn, db)
            if n:
                print(f"[{label}] {n}")
        except Exception as e:  # noqa: BLE001
            print(f"[{label}] error: {e}")
        finally:
            db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Tugas berkala: sapu order kedaluwarsa, dan tarik order dari Google Sheet."""
    tasks = []

    if settings.order_stale_seconds > 0 and settings.sweeper_interval_seconds > 0:
        tasks.append(asyncio.create_task(_periodic(
            "sweeper", settings.sweeper_interval_seconds,
            lambda db: (lambda n: f"{n} order kedaluwarsa ditandai failed" if n else 0)(sweep_stale_orders(db)),
        )))

    if settings.sheet_sync_interval_seconds > 0:
        tasks.append(asyncio.create_task(_periodic(
            "sheet-sync", settings.sheet_sync_interval_seconds,
            lambda db: (lambda n: f"{n} order baru diimpor dari Google Sheet" if n else 0)(sync_enabled_sheets(db)),
        )))

    try:
        yield
    finally:
        for t in tasks:
            t.cancel()


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Batasi permintaan per IP. Endpoint publik dibatasi paling ketat."""
    path = request.url.path
    if path.startswith("/api/v1/bots/heartbeat") or path.startswith("/api/v1/bots/claim") \
            or path.startswith("/api/v1/bots/result"):
        bucket, limit = "bot", settings.rate_limit_bot
    elif path.startswith("/api/v1/"):
        bucket, limit = "admin", settings.rate_limit_admin
    else:
        bucket, limit = "public", settings.rate_limit_public

    client_ip = request.client.host if request.client else "unknown"
    if not limiter.allow(f"{bucket}:{client_ip}", limit, 60):
        return JSONResponse(
            {"detail": "Too many requests"},
            status_code=429,
            headers={"Retry-After": "60"},
        )
    return await call_next(request)

def response(bot: Bot) -> BotResponse: return BotResponse(id=bot.id, name=bot.name, username=bot.username, game=bot.game, status=bot.status, last_heartbeat_at=bot.last_heartbeat_at, server=bot.server, ping_ms=bot.ping_ms)

def require_registration_key(key: str | None = Header(default=None, alias="X-Registration-Key")):
    if key != settings.bot_registration_key: raise HTTPException(status_code=401, detail="Invalid registration key")

def require_admin(key: str | None = Header(default=None, alias="X-Admin-Key")):
    # dipakai semua endpoint dashboard. Kunci ini HANYA boleh dipegang server-side (proxy Next.js), jangan di browser.
    if key != settings.admin_api_key: raise HTTPException(status_code=401, detail="Admin key required")

def authenticate_bot(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "): raise HTTPException(status_code=401, detail="Bearer token required")
    return authorization.removeprefix("Bearer ").strip()

def resolve_bot(db: Session, token: str) -> Bot:
    """Cari bot dari Bearer token.

    Jalur cepat: cocokkan prefix ber-index, lalu argon2 sekali. Baris lama yang
    belum punya prefix dipindai sebagai fallback dan langsung diisi prefix-nya,
    sehingga setelah sekali auth ikut jalur cepat.
    """
    repo = SqlAlchemyBotRepository(db)
    prefix = token_prefix(token)

    for bot, stored in repo.find_by_prefix(prefix):
        if verify_token(token, stored):
            return bot

    for bot, stored in repo.legacy_candidates():
        if verify_token(token, stored):
            repo.backfill_prefix(bot.id, prefix)
            return bot

    raise HTTPException(status_code=401, detail="Invalid bot token")

def _aware(dt):
    return dt.replace(tzinfo=timezone.utc) if (dt is not None and dt.tzinfo is None) else dt

def bot_is_online(bot: Bot) -> bool:
    hb = _aware(bot.last_heartbeat_at)
    return hb is not None and (datetime.now(timezone.utc) - hb).total_seconds() <= settings.heartbeat_timeout_seconds

PET_CATEGORY = "Pets"


def _looks_like_uuid(value: str) -> bool:
    return len(value) == 36 and value.count("-") == 4


def _canon(value: str) -> str:
    """Bentuk baku untuk membandingkan nama kategori/item.

    Order dari Google Sheet diketik manusia, jadi ejaannya tak pernah persis:
    "seeds" vs "Seeds", "Dragon Breath" vs "Dragon's Breath". Perbandingan
    persis membuat order gagal `no_bot_has_stock` padahal stoknya ada.

    Tiap kata dibuang akhiran "s"-nya, sehingga bentuk jamak dan sisipan "'s"
    ikut senada: "Dragon's Breath" dan "Dragon Breath" sama-sama jadi
    "dragonbreath", "seed" dan "Seeds" sama-sama "seed".
    """
    kata = re.split(r"[^a-z0-9]+", (value or "").lower())
    return "".join(k[:-1] if k.endswith("s") else k for k in kata if k)


def _match_key(bucket: dict, wanted: str) -> str | None:
    """Cari kunci di `bucket` yang cocok dengan `wanted`.

    Persis dulu; baru longgar. Kalau bentuk longgarnya cocok dengan LEBIH DARI
    SATU kunci berbeda, tidak ada yang dipilih — menebak berarti berisiko
    mengirim barang yang salah, dan itu lebih buruk daripada order gagal.
    """
    if wanted in bucket:
        return wanted

    for target in _bentuk(wanted):
        ketemu = _cari_kunci(bucket, target)
        if ketemu:
            return ketemu
    return None


def _bentuk(nama: str) -> list[str]:
    """Bentuk-bentuk baku yang boleh dicoba untuk sebuah nama.

    Listing marketplace lazim menambahkan kata jenisnya di belakang nama
    ("Strawberry Seed"), padahal katalog game menyimpannya polos
    ("Strawberry") dan kategorinya sudah menyebutkan jenis itu.
    """
    hasil = [_canon(nama)]
    polos = _canon(re.sub(r"\b(seeds?|pets?)\b", " ", (nama or "").lower()))
    if polos and polos not in hasil:
        hasil.append(polos)
    return [b for b in hasil if b]


def _cari_kunci(bucket: dict, target: str) -> str | None:
    cocok = [k for k in bucket if _canon(k) == target]
    return cocok[0] if len(cocok) == 1 else None


def owned_count(inventory: dict, names: dict, category: str, item_key: str) -> int:
    """Jumlah yang dimiliki untuk (category, item_key).

    Untuk `Pets`, tiap ekor punya UUID sendiri sehingga tak bisa dipesan lewat
    kunci tetap. Karena itu `item_key` pet boleh berupa NAMA (mis. "Raccoon"),
    dan di sini dihitung berapa ekor yang namanya cocok. UUID tetap diterima
    demi order lama.
    """
    cat = _match_key(inventory, category)
    if cat is None:
        return 0
    bucket = inventory.get(cat) or {}

    if cat != PET_CATEGORY or _looks_like_uuid(item_key):
        key = _match_key(bucket, item_key)
        return bucket.get(key, 0) if key else 0

    name_map = (names or {}).get(cat) or {}
    bentuk = set(_bentuk(item_key))
    return sum(
        1 for uuid in bucket
        if _canon(name_map.get(uuid) or uuid) in bentuk
    )


def can_fulfill(inventory: dict, items, names: dict | None = None) -> bool:
    for it in items:
        if owned_count(inventory, names or {}, it.category, it.item_key) < it.count:
            return False
    return True

def canonical_item(inventory: dict, names: dict, category: str, item_key: str) -> tuple[str, str]:
    """Ejaan (category, item_key) persis seperti di inventaris bot.

    Backend boleh longgar saat mencocokkan stok, tapi bot mencari item di game
    dengan kunci yang kita kirim — kalau ejaannya beda, bot tak menemukannya
    walau barangnya ada. Jadi bakukan dulu sebelum order diserahkan.
    """
    cat = _match_key(inventory, category)
    if cat is None:
        return category, item_key
    bucket = inventory.get(cat) or {}

    if cat != PET_CATEGORY or _looks_like_uuid(item_key):
        return cat, (_match_key(bucket, item_key) or item_key)

    name_map = (names or {}).get(cat) or {}
    bentuk = set(_bentuk(item_key))
    for uuid in bucket:
        nama = name_map.get(uuid) or uuid
        if _canon(nama) in bentuk:
            return cat, nama
    return cat, item_key


def order_response(o: Order, inventory: dict | None = None, names: dict | None = None) -> OrderResponse:
    def item_dict(i):
        cat, key = i.category, i.item_key
        if inventory is not None:
            cat, key = canonical_item(inventory, names or {}, cat, key)
        return {"category": cat, "item_key": key, "count": i.count}

    return OrderResponse(
        id=o.id, recipient=o.recipient,
        items=[item_dict(i) for i in o.items],
        note=o.note, source=o.source or "manual", status=o.status, assigned_bot=o.assigned_bot,
        sent_total=o.sent_total, requested_total=o.requested_total, error=o.error,
        created_at=o.created_at, updated_at=o.updated_at,
    )

def _kurang_apa(online: list, items) -> str:
    """Sebut item mana yang kurang, plus stok terbanyak yang ada.

    "no_bot_has_stock" saja tak cukup untuk menindaklanjuti: penyebab tersering
    adalah salah ketik nama item di sheet, dan itu hanya kelihatan kalau
    ditampilkan bahwa stok terbanyak = 0.
    """
    if not online:
        return "tak ada bot online"
    kurang = []
    for it in items:
        ada = max(owned_count(stok, nm, it.category, it.item_key) for stok, nm in online)
        if ada < it.count:
            kurang.append(f"{it.category}/{it.item_key}: minta {it.count}, stok terbanyak {ada}")
    return "; ".join(kurang) or "stok berubah saat diperiksa"


def sweep_stale_orders(db: Session) -> int:
    """Tandai `failed` order pending yang sudah lama & tak bisa dipenuhi siapa pun.

    Tanpa ini, order dengan item yang tak dimiliki bot mana pun akan menggantung
    `pending` selamanya tanpa penjelasan. Order yang masih mungkin dipenuhi bot
    online TIDAK disentuh, berapa pun umurnya.
    """
    if settings.order_stale_seconds <= 0:
        return 0

    bot_repo = SqlAlchemyBotRepository(db)
    inv_repo = SqlAlchemyBotInventoryRepository(db)
    orders = SqlAlchemyOrderRepository(db)

    online = [(inv_repo.get(b.id) or {}, inv_repo.get_names(b.id) or {})
              for b in bot_repo.list() if bot_is_online(b)]
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=settings.order_stale_seconds)

    swept = 0
    for order in orders.list_claimable():
        created = _aware(order.created_at)
        if created is None or created > cutoff:
            continue
        if any(can_fulfill(stock, order.items, nm) for stock, nm in online):
            continue  # masih ada yang sanggup — biarkan
        order.status = OrderStatus.FAILED
        order.error = "no_bot_has_stock (kedaluwarsa) — " + _kurang_apa(online, order.items)
        orders.save(order)
        swept += 1
    return swept


@app.get("/health")
def health(): return {"status": "ok", "service": settings.app_name}


@app.post("/api/v1/orders/sweep", dependencies=[Depends(require_admin)])
def sweep_now(db: Session = Depends(get_db)):
    """Jalankan sweeper manual — berguna untuk membersihkan order nyangkut."""
    return {"swept": sweep_stale_orders(db)}


# ============================ WEBHOOK U7BUY ============================

@app.post("/api/v1/webhooks/u7buy")
async def u7buy_webhook(request: Request, db: Session = Depends(get_db)):
    """Terima notifikasi U7Buy.

    U7Buy menunggu balasan maksimal 5 detik dan mengulang sampai 5×. Jadi di sini
    kita hanya memverifikasi tanda tangan lalu menyimpan event, dan langsung
    membalas. Pemrosesan (ambil detail order, buat order) menyusul terpisah.
    """
    raw = (await request.body()).decode("utf-8", errors="replace")
    received_sig = request.headers.get(settings.u7buy_signature_header)

    if settings.u7buy_verify_signature:
        if not verify_u7buy(settings.u7buy_app_id, settings.u7buy_app_secret, raw, received_sig):
            # Dokumentasi U7Buy tidak memuat contoh tanda tangan; log kandidat
            # agar formatnya bisa dicocokkan saat webhook asli pertama masuk.
            print(f"[u7buy] tanda tangan tidak cocok. header={settings.u7buy_signature_header!r} "
                  f"diterima={received_sig!r} semua_header={dict(request.headers)}")
            print(f"[u7buy] kandidat={debug_u7buy(settings.u7buy_app_id, settings.u7buy_app_secret, raw)}")
            raise HTTPException(status_code=401, detail="Invalid signature")
    else:
        print("[u7buy] ⚠ verifikasi tanda tangan DIMATIKAN — jangan dipakai di produksi")

    try:
        body = json.loads(raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="Body bukan JSON")

    event = str(body.get("event") or "unknown")
    data = body.get("data") or {}
    ref = data.get("orderId") or data.get("offerId") or body.get("timestamp") or ""
    dedupe_key = f"{event}:{ref}"

    row, is_new = SqlAlchemyWebhookRepository(db).record("u7buy", event, dedupe_key, raw)
    if is_new:
        print(f"[u7buy] event diterima: {dedupe_key}")
    else:
        print(f"[u7buy] event berulang, diabaikan: {dedupe_key}")

    # Format balasan yang diminta U7Buy
    return {"status": "OK"}


@app.post("/api/v1/webhooks/capture/{token}/{label}")
async def capture_webhook(token: str, label: str, request: Request, db: Session = Depends(get_db)):
    """Tampung payload webhook apa pun, untuk mengetahui bentuk aslinya.

    Dipakai saat menyambungkan pengirim yang formatnya belum diketahui — misalnya
    fitur "notifikasi ke Discord" milik marketplace: URL-nya diarahkan ke sini,
    lalu payload yang masuk bisa diperiksa di dashboard.

    Pengirim seperti webhook Discord tidak dapat mengirim header khusus, sehingga
    `token` di URL adalah satu-satunya pengaman. Perlakukan URL ini seperti kata
    sandi, dan matikan (`CAPTURE_WEBHOOK_TOKEN` kosong) bila tidak dipakai.
    """
    if not settings.capture_webhook_token:
        raise HTTPException(status_code=404, detail="Not found")
    if not hmac.compare_digest(token, settings.capture_webhook_token):
        raise HTTPException(status_code=404, detail="Not found")

    raw = (await request.body()).decode("utf-8", errors="replace")
    safe_label = "".join(c for c in label if c.isalnum() or c in "-_")[:30] or "capture"

    repo = SqlAlchemyWebhookRepository(db)
    # tiap kiriman disimpan terpisah — di tahap ini kita justru ingin melihat semuanya
    dedupe = f"{safe_label}:{datetime.now(timezone.utc).timestamp()}"
    repo.record(safe_label, "captured", dedupe, raw[:20000])
    print(f"[capture:{safe_label}] {len(raw)} byte diterima")

    # Discord membalas 204 tanpa isi; sebagian pengirim mengharap 2xx apa pun
    return Response(status_code=204)


@app.get("/api/v1/webhooks/events/{event_id}", dependencies=[Depends(require_admin)])
def get_webhook_event(event_id: UUID, db: Session = Depends(get_db)):
    """Isi lengkap satu event — untuk memeriksa payload yang tertangkap."""
    from app.infrastructure.database.models.webhook_event import WebhookEventModel
    row = db.get(WebhookEventModel, event_id)
    if not row:
        raise HTTPException(status_code=404, detail="Event not found")
    return {
        "id": str(row.id), "source": row.source, "event": row.event,
        "status": row.status, "received_at": row.received_at,
        "payload": row.payload,
    }


@app.get("/api/v1/webhooks/events", dependencies=[Depends(require_admin)])
def list_webhook_events(db: Session = Depends(get_db)):
    """Riwayat webhook — untuk memantau & mendiagnosis integrasi."""
    rows = SqlAlchemyWebhookRepository(db).recent()
    return {
        "items": [
            {
                "id": str(r.id), "source": r.source, "event": r.event,
                "dedupe_key": r.dedupe_key, "status": r.status, "error": r.error,
                "received_at": r.received_at, "processed_at": r.processed_at,
            }
            for r in rows
        ],
        "total": len(rows),
    }

@app.post("/api/v1/bots", response_model=RegisterBotResponse, status_code=201, dependencies=[Depends(require_registration_key)])
def register_bot(payload: RegisterBotRequest, db: Session = Depends(get_db)):
    repo = SqlAlchemyBotRepository(db)
    if repo.find_by_username(payload.username): raise HTTPException(status_code=409, detail="Bot username already exists")
    token = generate_token(); bot = Bot(uuid4(), payload.name, payload.username, payload.game)
    repo.create(bot, hash_token(token), token_prefix(token))
    return {"bot": response(bot), "token": token}

@app.post("/api/v1/bots/heartbeat", response_model=BotResponse)
def heartbeat(payload: BotHeartbeatRequest, token: str = Depends(authenticate_bot), db: Session = Depends(get_db)):
    repo = SqlAlchemyBotRepository(db)
    bot = resolve_bot(db, token)
    bot.status = BotStatus.ONLINE; bot.last_heartbeat_at = datetime.now(timezone.utc); bot.server = payload.server; bot.ping_ms = payload.ping_ms
    if payload.inventory is not None:
        SqlAlchemyBotInventoryRepository(db).upsert(bot.id, payload.inventory, payload.names)
    return response(repo.save(bot))

@app.get("/api/v1/bots", response_model=BotListResponse, dependencies=[Depends(require_admin)])
def list_bots(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc); items = []
    for bot in SqlAlchemyBotRepository(db).list():
        hb = _aware(bot.last_heartbeat_at)
        if hb and (now - hb).total_seconds() > settings.heartbeat_timeout_seconds: bot.status = BotStatus.OFFLINE
        items.append(response(bot))
    return {"items": items, "total": len(items)}


# ============================ ORDERS / AUTO-SEND ============================

@app.delete("/api/v1/bots/{bot_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_bot(bot_id: UUID, db: Session = Depends(get_db)):
    """Cabut bot: token-nya langsung tak berlaku. Dipakai kalau token bocor."""
    SqlAlchemyBotInventoryRepository(db).delete(bot_id)
    if not SqlAlchemyBotRepository(db).delete(bot_id):
        raise HTTPException(status_code=404, detail="Bot not found")
    return None


@app.post("/api/v1/orders", response_model=OrderResponse, status_code=201, dependencies=[Depends(require_admin)])
def create_order(payload: CreateOrderRequest, db: Session = Depends(get_db)):
    items = [OrderItem(i.category, i.item_key, i.count) for i in payload.items]
    order = Order(uuid4(), payload.recipient.strip(), items, payload.note or "",
                  source=(payload.source or "manual").strip().lower())
    return order_response(SqlAlchemyOrderRepository(db).create(order))


@app.get("/api/v1/orders", response_model=OrderListResponse, dependencies=[Depends(require_admin)])
def list_orders(
    page: int = 1,
    page_size: int = 10,
    source: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    """Daftar order per halaman.

    `counts`/`sources` dihitung dari SELURUH order, bukan halaman ini, agar kartu
    ringkasan tetap benar saat berpindah halaman.
    """
    repo = SqlAlchemyOrderRepository(db)
    rows, total = repo.list_page(page=page, page_size=page_size, source=source, status=status)
    size = max(1, min(page_size, 100))
    return {
        "items": [order_response(o) for o in rows],
        "total": total,
        "page": max(1, page),
        "page_size": size,
        "total_pages": max(1, (total + size - 1) // size),
        "counts": repo.count_by_status(),
        "sources": repo.count_by_source(),
    }


@app.get("/api/v1/items", response_model=ItemsResponse, dependencies=[Depends(require_admin)])
def list_items(db: Session = Depends(get_db)):
    # agregasi stok dari semua bot ONLINE (sumber routing yang sama)
    bot_repo = SqlAlchemyBotRepository(db)
    inv_repo = SqlAlchemyBotInventoryRepository(db)
    agg: dict[tuple[str, str], dict] = {}
    for bot in bot_repo.list():
        if not bot_is_online(bot):
            continue
        inv = inv_repo.get(bot.id) or {}
        names = inv_repo.get_names(bot.id) or {}
        for cat, items in inv.items():
            for key, count in (items or {}).items():
                c = 1 if isinstance(count, dict) else int(count or 0)
                if c <= 0:
                    continue
                display = (names.get(cat) or {}).get(key)
                # Pet dikelompokkan per NAMA, bukan per UUID: pembeli memesan
                # "Raccoon", bukan seekor tertentu. Bot yang memilih ekornya
                # saat mengirim.
                agg_key = (cat, display or key) if cat == PET_CATEGORY and display else (cat, key)
                e = agg.setdefault(agg_key, {"total": 0, "bots": set(), "display": None})
                e["total"] += c
                e["bots"].add(bot.username)
                if e["display"] is None:
                    e["display"] = display
    result = [
        AvailableItem(
            category=c, item_key=k, display_name=v["display"] or k,
            total=v["total"], bots=sorted(v["bots"]),
        )
        for (c, k), v in sorted(agg.items(), key=lambda kv: (kv[0][0], kv[1]["display"] or kv[0][1]))
    ]
    return {"items": result, "total": len(result)}


@app.post("/api/v1/bots/claim")
def claim_order(payload: ClaimRequest, response: Response, token: str = Depends(authenticate_bot), db: Session = Depends(get_db)):
    bot = resolve_bot(db, token)
    inv_repo = SqlAlchemyBotInventoryRepository(db)
    inventory = payload.inventory if payload.inventory is not None else inv_repo.get(bot.id)
    names = payload.names if payload.names is not None else inv_repo.get_names(bot.id)
    if payload.inventory is not None:
        inv_repo.upsert(bot.id, payload.inventory, payload.names)  # simpan yang terbaru
    orders = SqlAlchemyOrderRepository(db)
    for order in orders.list_claimable():
        if not can_fulfill(inventory, order.items, names):
            continue
        # Ambil lewat UPDATE bersyarat — kalau bot lain lebih dulu, hasilnya None
        # dan kita lanjut ke order berikutnya. Mencegah dua bot mengklaim order
        # yang sama (yang berarti barang terkirim dobel).
        claimed = orders.claim_atomically(order.id, bot.username)
        if claimed is not None:
            return order_response(claimed, inventory, names)
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


@app.get("/api/v1/channels", response_model=ChannelListResponse, dependencies=[Depends(require_admin)])
def list_channels(db: Session = Depends(get_db)):
    items = [channel_response(c) for c in SqlAlchemyChannelRepository(db).list()]
    return {"items": items, "total": len(items)}


@app.post("/api/v1/channels", response_model=ChannelResponse, status_code=201, dependencies=[Depends(require_admin)])
def create_channel(payload: CreateChannelRequest, db: Session = Depends(get_db)):
    ch = Channel(uuid4(), payload.type, payload.name.strip(), config=payload.config or {})
    return channel_response(SqlAlchemyChannelRepository(db).create(ch))


@app.patch("/api/v1/channels/{channel_id}", response_model=ChannelResponse, dependencies=[Depends(require_admin)])
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


@app.delete("/api/v1/channels/{channel_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_channel(channel_id: UUID, db: Session = Depends(get_db)):
    if not SqlAlchemyChannelRepository(db).delete(channel_id):
        raise HTTPException(status_code=404, detail="Channel not found")
    return None


def sync_google_sheet(db: Session, ch: Channel) -> dict:
    """Impor order dari Google Sheet yang dipublikasikan sebagai CSV.

    `order_ref` WAJIB pada setiap baris. Itulah satu-satunya penanda yang membuat
    baris dikenali sebagai order yang sama saat sync berikutnya. Tanpa itu, sync
    berkala akan membuat order baru dari baris yang sama pada SETIAP siklus —
    artinya barang terkirim berulang ke pembeli yang sama.
    """
    repo = SqlAlchemyChannelRepository(db)
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
        # Kolom `source` opsional: sheet sering hanya perantara (mis. email
        # VCGamers ditulis ke sheet), jadi asal sebenarnya bisa disebutkan
        # agar order tidak semuanya terlabel "Google Sheet".
        row_source = (row.get("source") or "").strip().lower() or "google_sheet"
        try:
            count = max(1, int(row.get("count") or row.get("qty") or "1"))
        except ValueError:
            count = 1

        if not (recipient and category and item_key):
            continue  # baris kosong / belum lengkap — diamkan

        if not ref:
            errors.append(f"baris {i}: order_ref kosong — dilewati agar tidak terkirim berulang")
            skipped += 1
            continue

        if ref in imported_refs:
            skipped += 1
            continue

        try:
            order = Order(uuid4(), recipient.strip(), [OrderItem(category, item_key, count)],
                          note=f"gsheet:{ref}", source=row_source)
            orders.create(order)
            imported += 1
            new_refs.append(ref)
            imported_refs.add(ref)  # cegah duplikat dalam satu file yang sama
        except Exception as e:  # noqa: BLE001
            errors.append(f"baris {i}: {e}")

    ch.config = {**ch.config, "imported_refs": sorted(imported_refs)}
    ch.last_synced_at = datetime.now(timezone.utc)
    ch.status = ChannelStatus.CONNECTED
    repo.save(ch)
    return {"imported": imported, "skipped": skipped, "errors": errors}


def sync_enabled_sheets(db: Session) -> int:
    """Sync semua channel Google Sheet yang aktif. Dipakai penjadwal."""
    total = 0
    for ch in SqlAlchemyChannelRepository(db).list():
        if ch.type != ChannelType.GOOGLE_SHEET or not ch.enabled:
            continue
        if not (ch.config or {}).get("csv_url", "").strip():
            continue
        result = sync_google_sheet(db, ch)
        total += result["imported"]
        if result["errors"]:
            print(f"[sheet-sync] {ch.name}: {result['errors'][:3]}")
    return total


@app.post("/api/v1/channels/{channel_id}/sync", response_model=SyncResult, dependencies=[Depends(require_admin)])
def sync_channel(channel_id: UUID, db: Session = Depends(get_db)):
    ch = SqlAlchemyChannelRepository(db).get(channel_id)
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")
    if ch.type != ChannelType.GOOGLE_SHEET:
        raise HTTPException(status_code=400, detail="Sync hanya untuk channel google_sheet")
    return sync_google_sheet(db, ch)


# ============================ LOADER (untuk loadstring(game:HttpGet(...))()) ============================

_SCRIPT_PATH = _Path(__file__).resolve().parent.parent.parent / "raynor-hub-frontend" / "public" / "RaynorHubBot.lua"


@app.get("/files/loader.lua", response_class=PlainTextResponse)
def get_loader_script():
    """Sajikan script bot, dengan BASE_URL disesuaikan alamat backend ini.

    Tanpa ini, alamat backend harus diedit langsung di file yang ter-track git,
    sehingga setiap `git pull` bentrok dengan editan tersebut.
    """
    if not _SCRIPT_PATH.exists():
        raise HTTPException(status_code=404, detail="Script belum ada di public/RaynorHubBot.lua")

    script = _SCRIPT_PATH.read_text(encoding="utf-8")
    target = settings.public_api_url.strip().rstrip("/")
    if target:
        script, n = re.subn(
            r'(\bBASE_URL\s*=\s*)"[^"]*"',
            lambda m: f'{m.group(1)}"{target}"',
            script,
            count=1,
        )
        if n == 0:
            print("[loader] peringatan: baris BASE_URL tidak ditemukan di script")
    return PlainTextResponse(script, media_type="text/plain")
