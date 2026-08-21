from __future__ import annotations

from datetime import UTC, datetime
from typing import cast
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from unigreen.catalogue.models import (
    Product,
    ProductCategory,
    ProductCategoryLink,
    ProductSpecification,
)
from unigreen.inquiries.domain import format_inquiry_reference
from unigreen.inquiries.models import Inquiry, InquirySequence


class InquiryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, inquiry_id: UUID) -> Inquiry | None:
        return cast(
            Inquiry | None,
            await self.session.scalar(
                select(Inquiry).where(Inquiry.id == inquiry_id).options(selectinload(Inquiry.lines))
            ),
        )

    async def get_by_reference(self, reference: str) -> Inquiry | None:
        return cast(
            Inquiry | None,
            await self.session.scalar(
                select(Inquiry)
                .where(Inquiry.reference == reference)
                .options(selectinload(Inquiry.lines))
            ),
        )

    async def get_by_idempotency_key(self, key: str) -> Inquiry | None:
        if not key:
            return None
        return cast(
            Inquiry | None,
            await self.session.scalar(
                select(Inquiry)
                .where(Inquiry.idempotency_key == key)
                .options(selectinload(Inquiry.lines))
            ),
        )

    async def get_products_by_ids(self, product_ids: list[UUID]) -> list[Product]:
        if not product_ids:
            return []
        result = await self.session.scalars(
            select(Product)
            .where(Product.id.in_(product_ids))
            .options(
                selectinload(Product.translations),
                selectinload(Product.category_links)
                .selectinload(ProductCategoryLink.category)
                .selectinload(ProductCategory.translations),
                selectinload(Product.specifications).selectinload(
                    ProductSpecification.translations
                ),
                selectinload(Product.media),
            )
        )
        return list(result.unique())

    async def next_reference(self, year: int | None = None) -> str:
        if year is None:
            year = datetime.now(UTC).year

        seq = await self.session.scalar(
            select(InquirySequence).where(InquirySequence.year == year).with_for_update()
        )
        if seq is None:
            seq = InquirySequence(year=year, last_value=1)
            self.session.add(seq)
            await self.session.flush()
            val = 1
        else:
            seq.last_value += 1
            val = seq.last_value
            await self.session.flush()

        return format_inquiry_reference(year, val)

    def add(self, entity: object) -> None:
        self.session.add(entity)

    async def commit(self) -> None:
        await self.session.commit()

    async def rollback(self) -> None:
        await self.session.rollback()

    async def refresh(self, entity: object) -> None:
        await self.session.refresh(entity)
