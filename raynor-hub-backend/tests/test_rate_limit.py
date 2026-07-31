"""Rate limiter menahan banjir permintaan dan tidak mengganggu lalu lintas normal."""
from app.infrastructure.security.rate_limit import RateLimiter


def test_blocks_after_limit_then_recovers_when_window_passes():
    rl = RateLimiter()
    # 3 permintaan pertama lolos
    assert [rl.allow("ip1", 3, 60) for _ in range(3)] == [True, True, True]
    # yang keempat ditolak
    assert rl.allow("ip1", 3, 60) is False

    # majukan waktu: tuakan semua hit melewati window (deterministik, tanpa sleep)
    bucket = rl._hits["ip1"]
    for i in range(len(bucket)):
        bucket[i] -= 61
    assert rl.allow("ip1", 3, 60) is True, "setelah window lewat harus boleh lagi"


def test_limits_are_per_key():
    rl = RateLimiter()
    for _ in range(3):
        rl.allow("ip1", 3, 60)
    assert rl.allow("ip1", 3, 60) is False, "ip1 sudah habis jatahnya"
    assert rl.allow("ip2", 3, 60) is True, "ip lain tidak boleh ikut terblokir"


def test_zero_limit_disables_limiter():
    rl = RateLimiter()
    assert all(rl.allow("ip1", 0, 60) for _ in range(50))
