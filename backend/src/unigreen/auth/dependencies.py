from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Annotated, cast

from fastapi import Depends, Request
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from unigreen.api.errors import ApiError
from unigreen.auth.permissions import Permission, has_permission
from unigreen.auth.rate_limit import LoginRateLimiter, RedisCounter
from unigreen.auth.repository import AuthRepository
from unigreen.auth.service import AuthContext, AuthService
from unigreen.config import get_settings
from unigreen.db import get_session


def get_auth_service(session: Annotated[AsyncSession, Depends(get_session)]) -> AuthService:
    return AuthService(AuthRepository(session), get_settings())


async def get_redis() -> AsyncIterator[Redis]:
    client = Redis.from_url(get_settings().redis_url)
    try:
        yield client
    finally:
        await client.aclose()


def get_login_rate_limiter(redis: Annotated[Redis, Depends(get_redis)]) -> LoginRateLimiter:
    settings = get_settings()
    return LoginRateLimiter(
        cast(RedisCounter, redis),
        limit=settings.login_attempt_limit,
        window_seconds=settings.login_attempt_window_seconds,
    )


async def get_auth_context(
    request: Request,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> AuthContext:
    token = request.cookies.get(get_settings().staff_session_cookie_name)
    return await service.authenticate(token)


async def require_csrf(
    request: Request,
    context: Annotated[AuthContext, Depends(get_auth_context)],
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> AuthContext:
    settings = get_settings()
    service.verify_csrf(
        context,
        request.cookies.get(settings.csrf_cookie_name),
        request.headers.get("X-CSRF-Token"),
    )
    return context


def require_permission(
    permission: Permission,
) -> Callable[..., Awaitable[AuthContext]]:
    async def dependency(
        context: Annotated[AuthContext, Depends(get_auth_context)],
    ) -> AuthContext:
        if not has_permission(context.user.role, permission):
            raise ApiError(
                status_code=403,
                code="PERMISSION_DENIED",
                message="You do not have permission to perform this action.",
            )
        return context

    return dependency


def require_mutation_permission(
    permission: Permission,
) -> Callable[..., Awaitable[AuthContext]]:
    async def dependency(
        context: Annotated[AuthContext, Depends(require_csrf)],
    ) -> AuthContext:
        if not has_permission(context.user.role, permission):
            raise ApiError(
                status_code=403,
                code="PERMISSION_DENIED",
                message="You do not have permission to perform this action.",
            )
        return context

    return dependency
