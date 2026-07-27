from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi import Response

from unigreen.api.errors import ApiError
from unigreen.auth.dependencies import require_permission
from unigreen.auth.models import StaffSession
from unigreen.auth.passwords import hash_password, verify_password
from unigreen.auth.permissions import Permission, has_permission, permissions_for
from unigreen.auth.rate_limit import LoginRateLimiter
from unigreen.auth.router import _set_auth_cookies
from unigreen.auth.schemas import StaffIdentityResponse
from unigreen.auth.service import AuthContext, AuthService
from unigreen.auth.tokens import (
    create_opaque_token,
    hash_client_ip,
    hash_token,
    tokens_match,
)
from unigreen.config import Settings
from unigreen.domain.enums import StaffRole, StaffStatus
from unigreen.staff.models import StaffUser


class FakeAuthRepository:
    def __init__(self, user: StaffUser | None = None) -> None:
        self.user = user
        self.staff_session: StaffSession | None = None
        self.commits = 0

    async def get_user_by_email(self, email: str) -> StaffUser | None:
        return self.user if self.user and self.user.email == email else None

    async def create_session(self, staff_session: StaffSession) -> None:
        self.staff_session = staff_session

    async def get_context_by_token_hash(
        self, token_hash: str
    ) -> tuple[StaffUser, StaffSession] | None:
        if (
            self.user
            and self.staff_session
            and self.staff_session.token_hash == token_hash
            and self.staff_session.revoked_at is None
        ):
            return self.user, self.staff_session
        return None

    async def commit(self) -> None:
        self.commits += 1


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, int] = {}
        self.expiries: dict[str, int] = {}

    async def incr(self, key: str) -> int:
        self.values[key] = self.values.get(key, 0) + 1
        return self.values[key]

    async def expire(self, key: str, seconds: int) -> object:
        self.expiries[key] = seconds
        return True


def make_user(
    *,
    role: StaffRole = StaffRole.CONTENT_EDITOR,
    status: StaffStatus = StaffStatus.ACTIVE,
) -> StaffUser:
    return StaffUser(
        id=uuid4(),
        email="editor@example.com",
        password_hash=hash_password("correct horse battery staple"),
        role=role,
        status=status,
        version=1,
    )


def test_password_hashing_never_accepts_missing_or_bad_hashes() -> None:
    password_hash = hash_password("secret")

    assert verify_password(password_hash, "secret") is True
    assert verify_password(password_hash, "wrong") is False
    assert verify_password(None, "secret") is False
    assert verify_password("not-an-argon-hash", "secret") is False


def test_tokens_are_opaque_hashed_and_constant_time_comparable() -> None:
    token = create_opaque_token()

    assert token
    assert len(hash_token(token)) == 64
    assert tokens_match(token, hash_token(token)) is True
    assert tokens_match("wrong", hash_token(token)) is False
    assert hash_client_ip("127.0.0.1") != "127.0.0.1"
    assert hash_client_ip(None) is None


def test_permission_matrix_matches_sprint_rules() -> None:
    assert permissions_for(StaffRole.SALES_STAFF) == {Permission.CATALOGUE_READ}
    assert has_permission(StaffRole.CONTENT_EDITOR, Permission.CATALOGUE_WRITE)
    assert has_permission(StaffRole.ADMINISTRATOR, Permission.CATALOGUE_PUBLISH)
    assert not has_permission(StaffRole.SALES_MANAGER, Permission.CATALOGUE_WRITE)


@pytest.mark.asyncio
async def test_login_creates_hashed_revocable_session() -> None:
    user = make_user()
    repository = FakeAuthRepository(user)
    service = AuthService(repository, Settings(staff_session_hours=6))

    result = await service.login(
        email=" Editor@Example.com ",
        password="correct horse battery staple",
        ip_address="127.0.0.1",
        user_agent="pytest",
    )

    assert result.user is user
    assert repository.staff_session is not None
    assert repository.staff_session.token_hash != result.session_token
    assert repository.staff_session.csrf_token_hash != result.csrf_token
    assert repository.staff_session.ip_hash != "127.0.0.1"
    assert repository.staff_session.user_agent_summary == "pytest"
    assert repository.commits == 1
    assert user.last_login_at is not None

    context = await service.authenticate(result.session_token)
    assert context.user is user
    service.verify_csrf(context, result.csrf_token, result.csrf_token)

    await service.logout(context)
    assert context.session.revoked_at is not None
    assert repository.commits == 2


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("user", "password", "code"),
    [
        (None, "wrong", "INVALID_CREDENTIALS"),
        (make_user(), "wrong", "INVALID_CREDENTIALS"),
        (
            make_user(status=StaffStatus.DISABLED),
            "correct horse battery staple",
            "ACCOUNT_DISABLED",
        ),
    ],
)
async def test_login_rejects_invalid_or_disabled_staff(
    user: StaffUser | None, password: str, code: str
) -> None:
    service = AuthService(FakeAuthRepository(user), Settings())

    with pytest.raises(ApiError) as caught:
        await service.login(
            email="editor@example.com",
            password=password,
            ip_address=None,
            user_agent=None,
        )

    assert caught.value.code == code


@pytest.mark.asyncio
async def test_authentication_and_csrf_fail_closed() -> None:
    service = AuthService(FakeAuthRepository(), Settings())

    with pytest.raises(ApiError):
        await service.authenticate(None)
    with pytest.raises(ApiError) as missing_session:
        await service.authenticate("unknown")
    assert missing_session.value.code == "AUTHENTICATION_REQUIRED"

    user = make_user()
    context = AuthContext(
        user=user,
        session=StaffSession(
            staff_user_id=user.id,
            token_hash=hash_token("session"),
            csrf_token_hash=hash_token("csrf"),
            expires_at=datetime.now(UTC) + timedelta(hours=1),
        ),
    )
    with pytest.raises(ApiError) as invalid_csrf:
        service.verify_csrf(context, "csrf", "different")
    assert invalid_csrf.value.code == "CSRF_VALIDATION_FAILED"


@pytest.mark.asyncio
async def test_permission_dependency_rejects_sales_mutation() -> None:
    user = make_user(role=StaffRole.SALES_STAFF)
    context = AuthContext(
        user=user,
        session=StaffSession(
            staff_user_id=user.id,
            token_hash=hash_token("session"),
            csrf_token_hash=hash_token("csrf"),
            expires_at=datetime.now(UTC) + timedelta(hours=1),
        ),
    )

    dependency = require_permission(Permission.CATALOGUE_WRITE)
    with pytest.raises(ApiError) as caught:
        await dependency(context)
    assert caught.value.code == "PERMISSION_DENIED"


@pytest.mark.asyncio
async def test_login_rate_limiter_sets_window_and_blocks_excess() -> None:
    redis = FakeRedis()
    limiter = LoginRateLimiter(redis, limit=2, window_seconds=60)

    await limiter.check("EDITOR@example.com", "127.0.0.1")
    await limiter.check("editor@example.com", "127.0.0.1")
    assert list(redis.expiries.values()) == [60]

    with pytest.raises(ApiError) as caught:
        await limiter.check("editor@example.com", "127.0.0.1")
    assert caught.value.status_code == 429


def test_staff_response_and_cookie_security_contract() -> None:
    user = make_user()
    identity = StaffIdentityResponse.from_user(user)
    response = Response()

    _set_auth_cookies(response, "session-token", "csrf-token")

    assert identity.permissions == [
        Permission.CATALOGUE_PUBLISH,
        Permission.CATALOGUE_READ,
        Permission.CATALOGUE_WRITE,
    ]
    set_cookie = response.headers.getlist("set-cookie")
    assert any(
        "ug_staff_session=session-token" in item and "HttpOnly" in item for item in set_cookie
    )
    assert any("ug_csrf=csrf-token" in item and "SameSite=strict" in item for item in set_cookie)
