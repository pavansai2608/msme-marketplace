"""Settings, read from the environment (and .env if present)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongo_url: str = ""
    content_weight: float = 0.6
    collab_weight: float = 0.4
    port: int = 8000

    # Name of the Mongo database. Empty means "use whatever the URL names".
    mongo_db: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
