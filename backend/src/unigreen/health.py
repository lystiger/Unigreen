from __future__ import annotations

import asyncio
from typing import Literal

from fastapi import APIRouter, Response, status
from pydantic import BaseModel
from redis.asyncio import Redis
from sqlalchemy import text

from unigreen.config import get_settings
from unigreen.db import engine

router = APIRouter(prefix="/health", tags=["health"])


class LiveResponse(BaseModel):
    status: Literal["ok"] = "ok"


class DependencyStatus(BaseModel):
    database: bool
    redis: bool


class ReadyResponse(BaseModel):
    status: Literal["ok", "unavailable"]
    checks: DependencyStatus


async def check_database() -> bool:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def check_redis() -> bool:
    client = Redis.from_url(get_settings().redis_url)
    try:
        return bool(await client.ping())
    except Exception:
        return False
    finally:
        await client.aclose()


@router.get("/live", response_model=LiveResponse)
async def live() -> LiveResponse:
    return LiveResponse()


@router.get(
    "/ready",
    response_model=ReadyResponse,
    responses={503: {"model": ReadyResponse, "description": "A dependency is unavailable"}},
)
async def ready(response: Response) -> ReadyResponse:
    timeout = get_settings().readiness_timeout_seconds
    try:
        database_ok, redis_ok = await asyncio.wait_for(
            asyncio.gather(check_database(), check_redis()),
            timeout=timeout,
        )
    except TimeoutError:
        database_ok = redis_ok = False

    is_ready = database_ok and redis_ok
    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return ReadyResponse(
        status="ok" if is_ready else "unavailable",
        checks=DependencyStatus(database=database_ok, redis=redis_ok),
    )
