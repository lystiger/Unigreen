from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from unigreen.db import Base

if TYPE_CHECKING:
    from unigreen.catalogue.models import Product


class ProductMedia(Base):
    __tablename__ = "product_media"
    __table_args__ = (
        CheckConstraint("sort_order >= 0", name="ck_product_media_sort_order"),
        CheckConstraint("size_bytes > 0", name="ck_product_media_size_bytes"),
        CheckConstraint("width > 0 AND height > 0", name="ck_product_media_dimensions"),
        CheckConstraint(
            "approval_status IN ('pending', 'approved', 'rejected')",
            name="ck_product_media_approval_status",
        ),
        Index(
            "uq_product_media_primary_per_product",
            "product_id",
            unique=True,
            postgresql_where=text("is_primary"),
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    storage_key: Mapped[str] = mapped_column(String(500), unique=True)
    checksum_sha256: Mapped[str] = mapped_column(String(64))
    original_filename: Mapped[str] = mapped_column(String(255))
    detected_mime_type: Mapped[str] = mapped_column(String(50))
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    alt_vi: Mapped[str] = mapped_column(String(500), default="")
    alt_en: Mapped[str] = mapped_column(String(500), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    variants: Mapped[dict[str, dict[str, str | int]]] = mapped_column(JSON, default=dict)
    source_reference: Mapped[str | None] = mapped_column(String(500))
    approval_status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product: Mapped[Product] = relationship(back_populates="media")
