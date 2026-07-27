import pytest
from httpx import AsyncClient

from unigreen import health


@pytest.mark.asyncio
async def test_liveness_includes_request_id(client: AsyncClient) -> None:
    response = await client.get("/health/live", headers={"X-Request-ID": "test-request"})

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["X-Request-ID"] == "test-request"


@pytest.mark.asyncio
async def test_readiness_reports_healthy_dependencies(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def healthy() -> bool:
        return True

    monkeypatch.setattr(health, "check_database", healthy)
    monkeypatch.setattr(health, "check_redis", healthy)

    response = await client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "checks": {"database": True, "redis": True},
    }


@pytest.mark.asyncio
async def test_readiness_returns_503_when_dependency_is_down(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def healthy() -> bool:
        return True

    async def unhealthy() -> bool:
        return False

    monkeypatch.setattr(health, "check_database", healthy)
    monkeypatch.setattr(health, "check_redis", unhealthy)

    response = await client.get("/health/ready")

    assert response.status_code == 503
    assert response.json() == {
        "status": "unavailable",
        "checks": {"database": True, "redis": False},
    }


@pytest.mark.asyncio
async def test_database_probe_handles_driver_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    class BrokenConnection:
        async def __aenter__(self) -> None:
            raise RuntimeError("database unavailable")

        async def __aexit__(self, *args: object) -> None:
            return None

    class BrokenEngine:
        def connect(self) -> BrokenConnection:
            return BrokenConnection()

    monkeypatch.setattr(health, "engine", BrokenEngine())

    assert await health.check_database() is False


@pytest.mark.asyncio
async def test_redis_probe_closes_client(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeRedis:
        closed = False

        async def ping(self) -> bool:
            return True

        async def aclose(self) -> None:
            self.closed = True

    client = FakeRedis()
    monkeypatch.setattr(
        "unigreen.health.Redis.from_url",
        lambda *_args, **_kwargs: client,
    )

    assert await health.check_redis() is True
    assert client.closed is True
