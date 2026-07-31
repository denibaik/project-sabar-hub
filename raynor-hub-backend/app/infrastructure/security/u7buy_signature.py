"""Verifikasi tanda tangan webhook U7Buy.

Dokumentasi resmi hanya menyebut langkahnya, tanpa contoh konkret maupun nama
header. Yang tertulis di sana:

    1. Pakai App Secret, App ID, dan parameter request webhook (json)
    2. Sambungkan App ID dan parameter request dengan ','
    3. Ubah hasil langkah sebelumnya jadi HMAC-SHA256 memakai secret
    4. Ubah hash-nya ke format Raw Hex

Karena "parameter request" bisa berarti body mentah atau body yang sudah
dinormalisasi, modul ini mencoba beberapa kandidat dan menerima bila salah satu
cocok. `debug_candidates()` memaparkan semuanya agar bisa dicocokkan dengan
webhook asli pertama yang masuk.
"""
from __future__ import annotations

import hashlib
import hmac
import json


def _hmac_hex(secret: str, message: str) -> str:
    return hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()


def candidate_signatures(app_id: str, app_secret: str, raw_body: str) -> dict[str, str]:
    """Beberapa tafsir yang masuk akal dari langkah dokumentasi."""
    candidates = {"raw": f"{app_id},{raw_body}"}

    # JSON yang dinormalisasi — beberapa platform menandatangani bentuk compact
    try:
        parsed = json.loads(raw_body)
        candidates["compact"] = f"{app_id},{json.dumps(parsed, separators=(',', ':'), ensure_ascii=False)}"
        candidates["compact_sorted"] = (
            f"{app_id},{json.dumps(parsed, separators=(',', ':'), sort_keys=True, ensure_ascii=False)}"
        )
    except (ValueError, TypeError):
        pass

    return {name: _hmac_hex(app_secret, msg) for name, msg in candidates.items()}


def verify(app_id: str, app_secret: str, raw_body: str, received: str | None) -> bool:
    """True kalau tanda tangan cocok dengan salah satu kandidat."""
    if not received or not app_secret:
        return False
    received = received.strip().lower()
    return any(
        hmac.compare_digest(received, expected.lower())
        for expected in candidate_signatures(app_id, app_secret, raw_body).values()
    )


def debug_candidates(app_id: str, app_secret: str, raw_body: str) -> dict[str, str]:
    """Untuk log diagnostik saat tanda tangan tidak cocok."""
    return candidate_signatures(app_id, app_secret, raw_body)
