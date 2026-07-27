from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="UNIGREEN_",
        extra="ignore",
    )

    app_name: str = "Uni-Green API"
    environment: Literal["local", "test", "staging", "production"] = "local"
    log_level: str = "INFO"
    database_url: str = "postgresql+asyncpg://unigreen:unigreen@localhost:5432/unigreen"
    redis_url: str = "redis://localhost:6379/0"
    allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:3001"]
    )
    readiness_timeout_seconds: float = Field(default=2.0, gt=0, le=10)


@lru_cache
def get_settings() -> Settings:
    return Settings()
