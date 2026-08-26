import pytest

from unigreen.config import Settings


def production_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "environment": "production",
        "database_url": "postgresql+asyncpg://app:secret@db:5432/unigreen",
        "redis_url": "redis://:secret@redis:6379/0",
        "allowed_origins": ["https://unigreen.example"],
        "public_media_base_url": "https://unigreen.example/api/v1/public/media",
        "quotation_recipient_email": "sales@unigreen.example",
        "smtp_host": "smtp.example.com",
        "smtp_username": "mailer",
        "smtp_password": "secret",
        "smtp_from_email": "sales@unigreen.example",
        "smtp_use_tls": True,
    }
    values.update(overrides)
    return Settings(**values)  # type: ignore[arg-type]


def test_production_settings_accept_complete_https_configuration() -> None:
    settings = production_settings()

    assert settings.environment == "production"


@pytest.mark.parametrize(
    ("overrides", "problem"),
    [
        ({"smtp_password": ""}, "smtp_password"),
        ({"allowed_origins": ["http://unigreen.example"]}, "HTTPS"),
        ({"public_media_base_url": "http://unigreen.example/media"}, "HTTPS"),
        ({"smtp_use_tls": False}, "SMTP TLS"),
    ],
)
def test_production_settings_reject_unsafe_configuration(
    overrides: dict[str, object], problem: str
) -> None:
    with pytest.raises(ValueError, match=problem):
        production_settings(**overrides)
