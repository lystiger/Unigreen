from __future__ import annotations

import argparse
import asyncio

from sqlalchemy import select

from unigreen.auth.passwords import hash_password
from unigreen.db import session_factory
from unigreen.domain.enums import StaffRole, StaffStatus
from unigreen.staff.models import StaffUser


async def create_admin(email: str, password: str) -> None:
    normalized_email = email.strip().lower()
    async with session_factory() as session:
        existing = await session.scalar(
            select(StaffUser).where(StaffUser.email == normalized_email)
        )
        if existing is not None:
            raise ValueError("A staff user with this email already exists.")
        session.add(
            StaffUser(
                email=normalized_email,
                password_hash=hash_password(password),
                role=StaffRole.ADMINISTRATOR,
                status=StaffStatus.ACTIVE,
            )
        )
        await session.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create the initial Uni-Green administrator.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()
    asyncio.run(create_admin(args.email, args.password))
