from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import NoReturn, Protocol

from unigreen.api.errors import ApiError
from unigreen.auth.models import StaffSession
from unigreen.auth.passwords import verify_password
from unigreen.auth.tokens import (
    create_opaque_token,
    hash_client_ip,
    hash_token,
    tokens_match,
)
from unigreen.config import Settings
from unigreen.domain.enums import StaffStatus
from unigreen.staff.models import StaffUser


class AuthRepositoryProtocol(Protocol):
    async def get_user_by_email(self, email: str) -> StaffUser | None: ...

    async def create_session(self, staff_session: StaffSession) -> None: ...

    async def get_context_by_token_hash(
        self, token_hash: str
    ) -> tuple[StaffUser, StaffSession] | None: ...

    async def commit(self) -> None: ...


@dataclass(frozen=True)
class LoginResult:
    user: StaffUser
    session_token: str
    csrf_token: str
    expires_at: datetime


@dataclass(frozen=True)
class AuthContext:
    user: StaffUser
    session: StaffSession


class AuthService:
    def __init__(self, repository: AuthRepositoryProtocol, settings: Settings) -> None:
        self.repository = repository
        self.settings = settings

    async def login(
        self,
        *,
        email: str,
        password: str,
        ip_address: str | None,
        user_agent: str | None,
    ) -> LoginResult:
        normalized_email = email.strip().lower()
        user = await self.repository.get_user_by_email(normalized_email)
        if not verify_password(user.password_hash if user else None, password):
            raise ApiError(
                status_code=401,
                code="INVALID_CREDENTIALS",
                message="The email or password is incorrect.",
            )
        assert user is not None
        if user.status != StaffStatus.ACTIVE:
            raise ApiError(
                status_code=403,
                code="ACCOUNT_DISABLED",
                message="This staff account is disabled.",
            )

        session_token = create_opaque_token()
        csrf_token = create_opaque_token()
        now = datetime.now(UTC)
        expires_at = now + timedelta(hours=self.settings.staff_session_hours)
        staff_session = StaffSession(
            staff_user_id=user.id,
            token_hash=hash_token(session_token),
            csrf_token_hash=hash_token(csrf_token),
            expires_at=expires_at,
            ip_hash=hash_client_ip(ip_address),
            user_agent_summary=(user_agent or "")[:255] or None,
        )
        user.last_login_at = now
        await self.repository.create_session(staff_session)
        await self.repository.commit()
        return LoginResult(
            user=user,
            session_token=session_token,
            csrf_token=csrf_token,
            expires_at=expires_at,
        )

    async def authenticate(self, session_token: str | None) -> AuthContext:
        if not session_token:
            self._authentication_required()
        result = await self.repository.get_context_by_token_hash(hash_token(session_token))
        if result is None or result[0].status != StaffStatus.ACTIVE:
            self._authentication_required()
        return AuthContext(user=result[0], session=result[1])

    async def logout(self, context: AuthContext) -> None:
        context.session.revoked_at = datetime.now(UTC)
        await self.repository.commit()

    @staticmethod
    def verify_csrf(
        context: AuthContext, cookie_token: str | None, header_token: str | None
    ) -> None:
        if (
            not cookie_token
            or not header_token
            or cookie_token != header_token
            or not tokens_match(header_token, context.session.csrf_token_hash)
        ):
            raise ApiError(
                status_code=403,
                code="CSRF_VALIDATION_FAILED",
                message="The CSRF token is missing or invalid.",
            )

    @staticmethod
    def _authentication_required() -> NoReturn:
        raise ApiError(
            status_code=401,
            code="AUTHENTICATION_REQUIRED",
            message="Staff authentication is required.",
        )
