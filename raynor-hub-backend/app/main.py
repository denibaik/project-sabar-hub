from datetime import datetime
from uuid import uuid4
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.config import settings
from app.domain.bots.entities import Bot, BotStatus
from app.infrastructure.database.session import Base, engine, get_db

from app.infrastructure.repositories.sqlalchemy_bot_repository import SqlAlchemyBotRepository
from app.infrastructure.security.token_hasher import generate_token, hash_token, verify_token
from app.api.v1.schemas.bots import BotHeartbeatRequest, BotListResponse, BotResponse, RegisterBotRequest, RegisterBotResponse

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
    bot, _ = match; bot.status = BotStatus.ONLINE; bot.last_heartbeat_at = datetime.utcnow(); bot.server = payload.server; bot.ping_ms = payload.ping_ms
    return response(repo.save(bot))

@app.get("/api/v1/bots", response_model=BotListResponse)
def list_bots(db: Session = Depends(get_db)):
    now = datetime.utcnow(); items = []
    for bot in SqlAlchemyBotRepository(db).list():
        if bot.last_heartbeat_at and (now - bot.last_heartbeat_at).total_seconds() > settings.heartbeat_timeout_seconds: bot.status = BotStatus.OFFLINE
        items.append(response(bot))
    return {"items": items, "total": len(items)}
