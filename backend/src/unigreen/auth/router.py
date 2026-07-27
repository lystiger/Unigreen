from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from unigreen.api.errors import openapi_error_responses
from unigreen.auth.dependencies import (
    get_auth_context,
    get_auth_service,
    get_login_rate_limiter,
    require_csrf,
)
from unigreen.auth.rate_limit import LoginRateLimiter
from unigreen.auth.schemas import LoginRequest, StaffIdentityResponse
from unigreen.auth.service import AuthContext, AuthService
from unigreen.config import get_settings

router = APIRouter(prefix="/api/v1/auth", tags=["staff authentication"])


def _set_auth_cookies(response: Response, session_token: str, csrf_token: str) -> None:
    settings = get_settings()
    secure = settings.environment in {"staging", "production"}
    max_age = settings.staff_session_hours * 3600
    response.set_cookie(
        settings.staff_session_cookie_name,
        session_token,
        max_age=max_age,
        secure=secure,
        httponly=True,
        samesite="lax",
        path="/api/v1",
    )
    response.set_cookie(
        settings.csrf_cookie_name,
        csrf_token,
        max_age=max_age,
        secure=secure,
        httponly=False,
        samesite="strict",
        path="/",
    )


@router.post(
    "/login",
    response_model=StaffIdentityResponse,
    responses=openapi_error_responses(401, 403, 422, 429),
)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    service: Annotated[AuthService, Depends(get_auth_service)],
    rate_limiter: Annotated[LoginRateLimiter, Depends(get_login_rate_limiter)],
) -> StaffIdentityResponse:
    ip_address = request.client.host if request.client else None
    await rate_limiter.check(str(payload.email), ip_address)
    result = await service.login(
        email=str(payload.email),
        password=payload.password,
        ip_address=ip_address,
        user_agent=request.headers.get("User-Agent"),
    )
    _set_auth_cookies(response, result.session_token, result.csrf_token)
    return StaffIdentityResponse.from_user(result.user)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=openapi_error_responses(401, 403),
)
async def logout(
    response: Response,
    context: Annotated[AuthContext, Depends(require_csrf)],
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> None:
    await service.logout(context)
    settings = get_settings()
    response.delete_cookie(settings.staff_session_cookie_name, path="/api/v1")
    response.delete_cookie(settings.csrf_cookie_name, path="/")


@router.get(
    "/me",
    response_model=StaffIdentityResponse,
    responses=openapi_error_responses(401),
)
async def me(
    context: Annotated[AuthContext, Depends(get_auth_context)],
) -> StaffIdentityResponse:
    return StaffIdentityResponse.from_user(context.user)
