from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from unigreen.db import Base
from unigreen.domain.enums import StaffRole, StaffStatus


class StaffUser(Base):
    __tablename__ = "staff_users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('sales_staff', 'sales_manager', 'content_editor', 'administrator')",
            name="ck_staff_users_role",
        ),
        CheckConstraint(
            "status IN ('active', 'disabled')",
            name="ck_staff_users_status",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[StaffRole] = mapped_column(String(32), default=StaffRole.CONTENT_EDITOR)
    status: Mapped[StaffStatus] = mapped_column(String(16), default=StaffStatus.ACTIVE)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    version: Mapped[int] = mapped_column(Integer, default=1)
