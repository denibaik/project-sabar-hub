from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Sabar Hub API"
    database_url: str = "sqlite:///./data/sqlite/sabar_hub.db"
    bot_registration_key: str = "dev-registration-key"
    heartbeat_timeout_seconds: int = 60
    order_retry_delay_seconds: int = 15  # cooldown sebelum order 'released' boleh di-claim lagi
    order_max_release: int = 8           # setelah sekian release (tak ada bot ber-stok) → failed
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
