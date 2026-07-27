from __future__ import annotations

from typing import cast
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from unigreen.audit.models import AuditEvent
from unigreen.catalogue.models import Product
from unigreen.domain.enums import PublicationStatus
from unigreen.media.models import ProductMedia


class MediaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_product(self, product_id: UUID) -> Product | None:
        return cast(
            Product | None,
            await self.session.scalar(
                select(Product).where(Product.id == product_id).options(selectinload(Product.media))
            ),
        )

    async def get_media(self, product_id: UUID, media_id: UUID) -> ProductMedia | None:
        return cast(
            ProductMedia | None,
            await self.session.scalar(
                select(ProductMedia).where(
                    ProductMedia.id == media_id,
                    ProductMedia.product_id == product_id,
                )
            ),
        )

    async def get_public_variant(self, media_id: UUID) -> ProductMedia | None:
        return cast(
            ProductMedia | None,
            await self.session.scalar(
                select(ProductMedia)
                .join(Product)
                .where(
                    ProductMedia.id == media_id,
                    ProductMedia.approval_status == "approved",
                    Product.status == PublicationStatus.PUBLISHED,
                )
            ),
        )

    async def count(self, product_id: UUID) -> int:
        return int(
            await self.session.scalar(
                select(func.count())
                .select_from(ProductMedia)
                .where(ProductMedia.product_id == product_id)
            )
            or 0
        )

    async def clear_primary(self, product_id: UUID, *, excluding: UUID | None = None) -> None:
        statement = update(ProductMedia).where(
            ProductMedia.product_id == product_id,
            ProductMedia.is_primary.is_(True),
        )
        if excluding is not None:
            statement = statement.where(ProductMedia.id != excluding)
        await self.session.execute(statement.values(is_primary=False))

    def add(self, media: ProductMedia) -> None:
        self.session.add(media)

    def add_audit(self, event: AuditEvent) -> None:
        self.session.add(event)

    async def delete(self, media: ProductMedia) -> None:
        await self.session.delete(media)

    async def commit(self) -> None:
        await self.session.commit()

    async def rollback(self) -> None:
        await self.session.rollback()
