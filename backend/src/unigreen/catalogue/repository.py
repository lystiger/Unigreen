from __future__ import annotations

from typing import cast
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from unigreen.audit.models import AuditEvent
from unigreen.catalogue.models import (
    Product,
    ProductCategory,
    ProductCategoryLink,
    ProductSpecification,
)


class CatalogueRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_categories(self) -> list[ProductCategory]:
        result = await self.session.scalars(
            select(ProductCategory)
            .options(selectinload(ProductCategory.translations))
            .order_by(ProductCategory.sort_order, ProductCategory.slug)
        )
        return list(result.unique())

    async def get_category(self, category_id: UUID) -> ProductCategory | None:
        return cast(
            ProductCategory | None,
            await self.session.scalar(
                select(ProductCategory)
                .where(ProductCategory.id == category_id)
                .options(selectinload(ProductCategory.translations))
            ),
        )

    async def list_products(self) -> list[Product]:
        result = await self.session.scalars(
            select(Product)
            .options(
                selectinload(Product.translations),
                selectinload(Product.category_links),
                selectinload(Product.specifications).selectinload(
                    ProductSpecification.translations
                ),
            )
            .order_by(Product.sort_order, Product.sku)
        )
        return list(result.unique())

    async def get_product(self, product_id: UUID) -> Product | None:
        return cast(
            Product | None,
            await self.session.scalar(
                select(Product)
                .where(Product.id == product_id)
                .options(
                    selectinload(Product.translations),
                    selectinload(Product.category_links),
                    selectinload(Product.specifications).selectinload(
                        ProductSpecification.translations
                    ),
                )
            ),
        )

    async def categories_exist(self, category_ids: list[UUID]) -> bool:
        if not category_ids:
            return True
        result = await self.session.scalars(
            select(ProductCategory.id).where(ProductCategory.id.in_(category_ids))
        )
        return len(set(result)) == len(set(category_ids))

    def add(self, entity: object) -> None:
        self.session.add(entity)

    def add_all(self, entities: list[object]) -> None:
        self.session.add_all(entities)

    async def delete_product_links(self, product_id: UUID) -> None:
        await self.session.execute(
            delete(ProductCategoryLink).where(ProductCategoryLink.product_id == product_id)
        )

    async def delete_specifications(self, product_id: UUID) -> None:
        await self.session.execute(
            delete(ProductSpecification).where(ProductSpecification.product_id == product_id)
        )

    async def delete(self, entity: object) -> None:
        await self.session.delete(entity)

    def add_audit(self, event: AuditEvent) -> None:
        self.session.add(event)

    async def commit(self) -> None:
        await self.session.commit()

    async def refresh(self, entity: object) -> None:
        await self.session.refresh(entity)
