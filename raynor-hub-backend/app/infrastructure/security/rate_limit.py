"""Rate limiter sederhana berbasis sliding window, disimpan di memori.

Tujuannya menahan penyalahgunaan kasar: membanjiri endpoint publik atau menebak
kunci/token secara brute force.

BATASAN yang perlu disadari: hitungannya per-proses. Kalau uvicorn dijalankan
dengan beberapa worker, tiap worker punya hitungan sendiri, sehingga batas
efektifnya menjadi limit × jumlah worker. Untuk batas yang ketat lintas worker
diperlukan penyimpanan bersama (mis. Redis).
"""
from __future__ import annotations

import time
from collections import defaultdict, deque


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._last_gc = 0.0

    def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        """True kalau request boleh lanjut; False kalau melewati batas."""
        if limit <= 0:
            return True
        now = time.monotonic()
        cutoff = now - window_seconds

        bucket = self._hits[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()

        if len(bucket) >= limit:
            return False

        bucket.append(now)
        self._gc(now, window_seconds)
        return True

    def _gc(self, now: float, window_seconds: int) -> None:
        """Buang key yang sudah tidak aktif agar memori tidak menumpuk."""
        if now - self._last_gc < 60:
            return
        self._last_gc = now
        cutoff = now - window_seconds
        for key in [k for k, v in self._hits.items() if not v or v[-1] < cutoff]:
            del self._hits[key]


limiter = RateLimiter()
