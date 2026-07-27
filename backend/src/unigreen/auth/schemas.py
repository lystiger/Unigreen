from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from unigreen.auth.permissions import Permission, permissions_for
from unigreen.domain.enums import StaffRole
from unigreen.staff.models import StaffUser


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=1024)


class StaffIdentityResponse(BaseModel):
    id: UUID
    email: str
    role: StaffRole
    permissions: list[Permission]

    @classmethod
    def from_user(cls, user: StaffUser) -> StaffIdentityResponse:
        return cls(
            id=user.id,
            email=user.email,
            role=user.role,
            permissions=sorted(permissions_for(user.role), key=str),
        )
