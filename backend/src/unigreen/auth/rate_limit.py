from __future__ import annotations

from hashlib import sha256
from typing import Protocol

from unigreen.api.errors import ApiError


class RedisCounter(Protocol):
    async def incr(self, key: str) -> int: ...

    async def expire(self, key: str, seconds: int) -> object: ...


class LoginRateLimiter:
    def __init__(self, redis: RedisCounter, *, limit: int, window_seconds: int) -> None:
        self.redis = redis
        self.limit = limit
        self.window_seconds = window_seconds

    async def check(self, email: str, ip_address: str | None) -> None:
        identity = f"{email.strip().lower()}:{ip_address or 'unknown'}"
        digest = sha256(identity.encode("utf-8")).hexdigest()
        key = f"unigreen:login:{digest}"
        attempts = await self.redis.incr(key)
        if attempts == 1:
            await self.redis.expire(key, self.window_seconds)
        if attempts > self.limit:
            raise ApiError(
                status_code=429,
                code="RATE_LIMITED",
                message="Too many login attempts. Please try again later.",
            )
