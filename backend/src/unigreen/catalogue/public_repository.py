from __future__ import annotations

from typing import Any, cast

from sqlalchemy import Select, and_, distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from unigreen.catalogue.models import (
    Product,
    ProductCategory,
    ProductCategoryLink,
    ProductCategoryTranslation,
    ProductSpecification,
    ProductTranslation,
)
from unigreen.catalogue.public_schemas import PublicProductQuery, PublicProductSort
from unigreen.domain.enums import PublicationStatus


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _public_product_options() -> tuple[Any, ...]:
    return (
        selectinload(Product.translations),
        selectinload(Product.category_links)
        .selectinload(ProductCategoryLink.category)
        .selectinload(ProductCategory.translations),
        selectinload(Product.specifications).selectinload(ProductSpecification.translations),
    )


class PublicCatalogueRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_categories(self, locale: str) -> list[ProductCategory]:
        result = await self.session.scalars(
            select(ProductCategory)
            .join(
                ProductCategoryTranslation,
                and_(
                    ProductCategoryTranslation.category_id == ProductCategory.id,
                    ProductCategoryTranslation.locale == locale,
                ),
            )
            .where(ProductCategory.status == PublicationStatus.PUBLISHED)
            .options(selectinload(ProductCategory.translations))
            .order_by(ProductCategory.sort_order, ProductCategoryTranslation.name)
        )
        return list(result.unique())

    async def list_products(self, query: PublicProductQuery) -> tuple[list[Product], int]:
        statement = (
            select(Product)
            .join(
                ProductTranslation,
                and_(
                    ProductTranslation.product_id == Product.id,
                    ProductTranslation.locale == query.locale,
                ),
            )
            .where(Product.status == PublicationStatus.PUBLISHED)
        )
        statement = self._apply_product_filters(statement, query)

        count_source = statement.with_only_columns(Product.id).order_by(None).subquery()
        count_statement = select(func.count(distinct(count_source.c.id)))
        total = int(await self.session.scalar(count_statement) or 0)

        statement = self._apply_sort(statement, query.sort)
        statement = (
            statement.options(*_public_product_options())
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        )
        result = await self.session.scalars(statement)
        return list(result.unique()), total

    async def get_product_by_slug(self, slug: str, locale: str) -> Product | None:
        return cast(
            Product | None,
            await self.session.scalar(
                select(Product)
                .join(
                    ProductTranslation,
                    and_(
                        ProductTranslation.product_id == Product.id,
                        ProductTranslation.locale == locale,
                    ),
                )
                .where(
                    Product.slug == slug,
                    Product.status == PublicationStatus.PUBLISHED,
                )
                .options(*_public_product_options())
            ),
        )

    @staticmethod
    def _apply_product_filters(
        statement: Select[tuple[Product]], query: PublicProductQuery
    ) -> Select[tuple[Product]]:
        if query.category:
            statement = (
                statement.join(
                    ProductCategoryLink,
                    ProductCategoryLink.product_id == Product.id,
                )
                .join(
                    ProductCategory,
                    ProductCategory.id == ProductCategoryLink.category_id,
                )
                .where(
                    ProductCategory.slug == query.category,
                    ProductCategory.status == PublicationStatus.PUBLISHED,
                )
            )
        if query.featured is not None:
            statement = statement.where(Product.featured == query.featured)
        if query.q and (search := query.q.strip()):
            pattern = f"%{_escape_like(search)}%"
            statement = statement.where(
                or_(
                    ProductTranslation.name.ilike(pattern, escape="\\"),
                    ProductTranslation.summary.ilike(pattern, escape="\\"),
                    Product.sku.ilike(pattern, escape="\\"),
                )
            )
        return statement

    @staticmethod
    def _apply_sort(
        statement: Select[tuple[Product]], sort: PublicProductSort
    ) -> Select[tuple[Product]]:
        if sort == PublicProductSort.NAME:
            return statement.order_by(ProductTranslation.name, Product.sku)
        if sort == PublicProductSort.NEWEST:
            return statement.order_by(Product.published_at.desc().nullslast(), Product.sku)
        return statement.order_by(Product.featured.desc(), Product.sort_order, Product.sku)
