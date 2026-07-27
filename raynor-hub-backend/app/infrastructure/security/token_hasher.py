import secrets
from pwdlib import PasswordHash

_hasher = PasswordHash.recommended()

def generate_token() -> str:
    return "sbr_bot_" + secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    return _hasher.hash(token)

def verify_token(token: str, hashed: str) -> bool:
    return _hasher.verify(token, hashed)
