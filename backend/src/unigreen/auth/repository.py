from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from unigreen.auth.models import StaffSession
from unigreen.staff.models import StaffUser


class AuthRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_user_by_email(self, email: str) -> StaffUser | None:
        result = await self.session.execute(select(StaffUser).where(StaffUser.email == email))
        return result.scalar_one_or_none()

    async def create_session(self, staff_session: StaffSession) -> None:
        self.session.add(staff_session)

    async def get_context_by_token_hash(
        self, token_hash: str
    ) -> tuple[StaffUser, StaffSession] | None:
        now = datetime.now(UTC)
        result = await self.session.execute(
            select(StaffUser, StaffSession)
            .join(StaffSession, StaffSession.staff_user_id == StaffUser.id)
            .where(
                StaffSession.token_hash == token_hash,
                StaffSession.revoked_at.is_(None),
                StaffSession.expires_at > now,
            )
        )
        row = result.one_or_none()
        return (row[0], row[1]) if row else None

    async def commit(self) -> None:
        await self.session.commit()
