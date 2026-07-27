from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from unigreen.db import Base
from unigreen.domain.enums import Locale, PublicationStatus


class ProductCategory(Base):
    __tablename__ = "product_categories"
    __table_args__ = (
        CheckConstraint("sort_order >= 0", name="ck_product_categories_sort_order"),
        CheckConstraint(
            "status IN ('draft', 'published', 'unpublished')",
            name="ck_product_categories_status",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    status: Mapped[PublicationStatus] = mapped_column(
        String(20), default=PublicationStatus.DRAFT, index=True
    )
    parent_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("product_categories.id", ondelete="RESTRICT"), index=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    version: Mapped[int] = mapped_column(Integer, default=1)

    translations: Mapped[list[ProductCategoryTranslation]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ProductCategoryTranslation(Base):
    __tablename__ = "product_category_translations"

    category_id: Mapped[UUID] = mapped_column(
        ForeignKey("product_categories.id", ondelete="CASCADE"), primary_key=True
    )
    locale: Mapped[Locale] = mapped_column(String(2), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    meta_title: Mapped[str | None] = mapped_column(String(255))
    meta_description: Mapped[str | None] = mapped_column(String(500))

    category: Mapped[ProductCategory] = relationship(back_populates="translations")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("sort_order >= 0", name="ck_products_sort_order"),
        CheckConstraint(
            "status IN ('draft', 'published', 'unpublished')",
            name="ck_products_status",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    sku: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    barcode: Mapped[str | None] = mapped_column(String(100), unique=True, index=True)
    status: Mapped[PublicationStatus] = mapped_column(
        String(20), default=PublicationStatus.DRAFT, index=True
    )
    oem_available: Mapped[bool] = mapped_column(Boolean, default=False)
    featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    version: Mapped[int] = mapped_column(Integer, default=1)

    translations: Mapped[list[ProductTranslation]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    category_links: Mapped[list[ProductCategoryLink]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    specifications: Mapped[list[ProductSpecification]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ProductSpecification.sort_order",
    )


class ProductTranslation(Base):
    __tablename__ = "product_translations"

    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), primary_key=True
    )
    locale: Mapped[Locale] = mapped_column(String(2), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    meta_title: Mapped[str | None] = mapped_column(String(255))
    meta_description: Mapped[str | None] = mapped_column(String(500))

    product: Mapped[Product] = relationship(back_populates="translations")


class ProductCategoryLink(Base):
    __tablename__ = "product_category_links"
    __table_args__ = (
        CheckConstraint("sort_order >= 0", name="ck_product_category_links_sort_order"),
    )

    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), primary_key=True
    )
    category_id: Mapped[UUID] = mapped_column(
        ForeignKey("product_categories.id", ondelete="RESTRICT"), primary_key=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    product: Mapped[Product] = relationship(back_populates="category_links")


class ProductSpecification(Base):
    __tablename__ = "product_specifications"
    __table_args__ = (
        UniqueConstraint("product_id", "key", name="uq_product_specification_key"),
        CheckConstraint("sort_order >= 0", name="ck_product_specifications_sort_order"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    key: Mapped[str] = mapped_column(String(100))
    value: Mapped[str] = mapped_column(String(500))
    unit: Mapped[str | None] = mapped_column(String(50))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_highlighted: Mapped[bool] = mapped_column(Boolean, default=False)

    product: Mapped[Product] = relationship(back_populates="specifications")
    translations: Mapped[list[ProductSpecificationTranslation]] = relationship(
        back_populates="specification",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ProductSpecificationTranslation(Base):
    __tablename__ = "product_specification_translations"

    specification_id: Mapped[UUID] = mapped_column(
        ForeignKey("product_specifications.id", ondelete="CASCADE"), primary_key=True
    )
    locale: Mapped[Locale] = mapped_column(String(2), primary_key=True)
    label: Mapped[str] = mapped_column(String(200))
    display_value_override: Mapped[str | None] = mapped_column(String(500))

    specification: Mapped[ProductSpecification] = relationship(back_populates="translations")
