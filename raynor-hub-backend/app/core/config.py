from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Sabar Hub API"
    database_url: str = "sqlite:///./data/sqlite/sabar_hub.db"
    bot_registration_key: str = "dev-registration-key"  # dipakai bot utk mendaftar
    admin_api_key: str = "dev-admin-key"                # dipakai dashboard (server-side saja!)
    heartbeat_timeout_seconds: int = 60
    order_retry_delay_seconds: int = 15  # cooldown sebelum order 'released' boleh di-claim lagi
    order_max_release: int = 8           # setelah sekian release (tak ada bot ber-stok) → failed
    # daftar origin dashboard, dipisah koma. Di VPS isi dgn domain asli.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

settings = Settings()
