from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from unigreen.db import Base
from unigreen.domain.enums import InquiryStatus, Locale

if TYPE_CHECKING:
    from unigreen.catalogue.models import Product
    from unigreen.staff.models import StaffUser


class InquirySequence(Base):
    __tablename__ = "inquiry_sequences"
    __table_args__ = (
        CheckConstraint("year >= 2020", name="ck_inquiry_sequences_year"),
        CheckConstraint("last_value >= 0", name="ck_inquiry_sequences_last_value"),
    )

    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    last_value: Mapped[int] = mapped_column(Integer, default=0)


class Inquiry(Base):
    __tablename__ = "inquiries"
    __table_args__ = (
        CheckConstraint(
            "status IN ('new', 'qualified', 'quoted', 'won', 'lost', 'spam', 'duplicate')",
            name="ck_inquiries_status",
        ),
        CheckConstraint("version >= 1", name="ck_inquiries_version"),
        Index(
            "ix_inquiries_idempotency_key",
            "idempotency_key",
            unique=True,
            postgresql_where=text("idempotency_key IS NOT NULL"),
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    reference: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    status: Mapped[InquiryStatus] = mapped_column(String(20), default=InquiryStatus.NEW, index=True)
    contact_name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(320), index=True)
    phone: Mapped[str | None] = mapped_column(String(50))
    company_name: Mapped[str | None] = mapped_column(String(200))
    tax_code: Mapped[str | None] = mapped_column(String(50))
    address: Mapped[str | None] = mapped_column(String(500))
    destination: Mapped[str | None] = mapped_column(String(200))
    notes: Mapped[str | None] = mapped_column(Text)
    oem_requirements: Mapped[str | None] = mapped_column(Text)
    locale: Mapped[Locale] = mapped_column(String(2), default=Locale.VI)
    source: Mapped[str] = mapped_column(String(50), default="public_website")
    assigned_staff_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("staff_users.id", ondelete="SET NULL"), index=True
    )
    idempotency_key: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    version: Mapped[int] = mapped_column(Integer, default=1)

    lines: Mapped[list[InquiryLine]] = relationship(
        back_populates="inquiry",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="InquiryLine.sort_order",
    )
    assigned_staff: Mapped[StaffUser | None] = relationship(lazy="selectin")


class InquiryLine(Base):
    __tablename__ = "inquiry_lines"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_inquiry_lines_quantity_positive"),
        CheckConstraint("sort_order >= 0", name="ck_inquiry_lines_sort_order"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    inquiry_id: Mapped[UUID] = mapped_column(
        ForeignKey("inquiries.id", ondelete="CASCADE"), index=True
    )
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), index=True
    )
    product_sku: Mapped[str] = mapped_column(String(100))
    product_name: Mapped[str] = mapped_column(String(200))
    product_snapshot: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    unit: Mapped[str] = mapped_column(String(50))
    requirements: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    inquiry: Mapped[Inquiry] = relationship(back_populates="lines")
    product: Mapped[Product] = relationship(lazy="selectin")
