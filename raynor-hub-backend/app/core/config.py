from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Sabar Hub API"
    database_url: str = "sqlite:///./data/sqlite/sabar_hub.db"
    bot_registration_key: str = "dev-registration-key"
    heartbeat_timeout_seconds: int = 60
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
