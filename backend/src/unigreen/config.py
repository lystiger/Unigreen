from __future__ import annotations

from functools import lru_cache
from pathlib import Path
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
    storage_root: Path = Path("/app/storage")
    public_media_base_url: str = "http://localhost:8000/api/v1/public/media"
    staff_session_cookie_name: str = "ug_staff_session"
    csrf_cookie_name: str = "ug_csrf"
    staff_session_hours: int = Field(default=12, ge=1, le=168)
    login_attempt_limit: int = Field(default=5, ge=1, le=100)
    login_attempt_window_seconds: int = Field(default=900, ge=60, le=86400)
    quotation_recipient_email: str = "dohunganh5002@gmail.com"
    smtp_host: str = ""
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    smtp_from_email: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
