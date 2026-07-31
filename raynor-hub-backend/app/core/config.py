from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Sabar Hub API"
    database_url: str = "sqlite:///./data/sqlite/sabar_hub.db"
    bot_registration_key: str = "dev-registration-key"  # dipakai bot utk mendaftar
    admin_api_key: str = "dev-admin-key"                # dipakai dashboard (server-side saja!)
    heartbeat_timeout_seconds: int = 60
    order_retry_delay_seconds: int = 15  # cooldown sebelum order 'released' boleh di-claim lagi
    order_max_release: int = 8           # setelah sekian release (tak ada bot ber-stok) → failed
    # Backorder sweeper: order pending selama ini & tak ada bot online ber-stok → failed.
    # 0 = matikan sweeper.
    order_stale_seconds: int = 900       # 15 menit
    sweeper_interval_seconds: int = 60
    # Auto-sync Google Sheet: tarik order baru dari sheet tiap sekian detik.
    # 0 = matikan (sync hanya lewat tombol di dashboard).
    sheet_sync_interval_seconds: int = 120
    # Rate limit per IP per menit (0 = matikan). Hitungan per-proses uvicorn.
    rate_limit_public: int = 120   # /health, /files/*
    rate_limit_bot: int = 600      # heartbeat + claim + result (bot polling tiap 5 dtk)
    rate_limit_admin: int = 600    # dashboard polling 3 endpoint tiap 3 dtk

    # --- U7Buy ---
    u7buy_app_id: str = ""
    u7buy_app_secret: str = ""
    u7buy_base_url: str = "https://openapi.u7buy.com/prod-api"
    # Dokumentasi U7Buy tidak menyebut nama header tanda tangan. Set sesuai
    # header yang benar-benar dikirim saat webhook pertama masuk.
    u7buy_signature_header: str = "x-signature"
    # false = terima webhook tanpa verifikasi (HANYA untuk mencocokkan format
    # tanda tangan saat integrasi awal; jangan dibiarkan false di produksi).
    u7buy_verify_signature: bool = True
    # Hanya order game ini yang diproses. Akun U7Buy bisa menjual beberapa game
    # sekaligus, dan bot hanya berada di satu game — tanpa saringan ini bot akan
    # mencoba mengirim item yang tidak ada di game yang dimainkannya.
    u7buy_game_name: str = "Grow a Garden 2"
    # Ubah status order di U7Buy (start/complete delivery) setelah bot mengirim.
    # MATI secara default: ini mengubah order pembeli yang sesungguhnya, jadi
    # harus dinyalakan secara sadar setelah alurnya terbukti benar.
    u7buy_callback_enabled: bool = False
    # Selang pemrosesan event webhook yang tertunda. 0 = matikan.
    u7buy_process_interval_seconds: int = 60
    # Menulis ulang stok listing di U7Buy agar sesuai stok bot.
    # MATI secara default. Dokumentasi U7Buy tidak merinci isi body PUT-nya,
    # sehingga penulisannya dilakukan dengan menyalin balik objek offer yang
    # baru dibaca — hanya `inventory` yang diubah. Uji pada satu listing dulu.
    u7buy_stock_sync_enabled: bool = False

    # --- Penangkap webhook generik (mis. notifikasi Discord dari VCGamers) ---
    # Rahasia ini menjadi bagian URL. Pengirim seperti webhook Discord tidak bisa
    # mengirim header khusus, jadi URL-lah satu-satunya pengaman. Kosong = matikan.
    capture_webhook_token: str = ""
    # daftar origin dashboard, dipisah koma. Di VPS isi dgn domain asli.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    # Alamat backend yang dipakai BOT. Disuntikkan ke script saat disajikan lewat
    # /files/loader.lua, sehingga file di repo tak perlu diedit di server —
    # editan seperti itu membuat `git pull` bentrok setiap kali ada pembaruan.
    # Kosong = pakai nilai yang tertulis di script.
    public_api_url: str = ""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

settings = Settings()
