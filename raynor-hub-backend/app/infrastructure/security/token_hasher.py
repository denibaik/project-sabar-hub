import secrets
from pwdlib import PasswordHash

_hasher = PasswordHash.recommended()

TOKEN_PREFIX_LEN = 20  # "sbr_bot_" + 12 karakter acak


def generate_token() -> str:
    return "sbr_bot_" + secrets.token_urlsafe(32)


def token_prefix(token: str) -> str:
    """Bagian depan token, disimpan di kolom ber-index untuk pencarian cepat.

    Ini BUKAN pengaman — hanya penyempit pencarian agar argon2 (yang lambat)
    cukup dijalankan sekali, bukan sekali per bot. Keamanan tetap dari hash.
    """
    return (token or "")[:TOKEN_PREFIX_LEN]

def hash_token(token: str) -> str:
    return _hasher.hash(token)

def verify_token(token: str, hashed: str) -> bool:
    return _hasher.verify(token, hashed)
