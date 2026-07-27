from __future__ import annotations

from math import ceil

from unigreen.api.errors import ApiError
from unigreen.catalogue.models import Product, ProductCategory, ProductTranslation
from unigreen.catalogue.public_repository import PublicCatalogueRepository
from unigreen.catalogue.public_schemas import (
    PaginationMetadata,
    PublicCategoryResponse,
    PublicMediaResponse,
    PublicMediaVariantResponse,
    PublicProductDetail,
    PublicProductPage,
    PublicProductQuery,
    PublicProductSummary,
    PublicSpecificationResponse,
)
from unigreen.domain.enums import Locale, PublicationStatus
from unigreen.media.models import ProductMedia


class PublicCatalogueService:
    def __init__(
        self,
        repository: PublicCatalogueRepository,
        public_media_base_url: str = "/api/v1/public/media",
    ) -> None:
        self.repository = repository
        self.public_media_base_url = public_media_base_url.rstrip("/")

    async def categories(self, locale: Locale) -> list[PublicCategoryResponse]:
        categories = await self.repository.list_categories(locale.value)
        return [
            response
            for category in categories
            if (response := self._category_response(category, locale)) is not None
        ]

    async def products(self, query: PublicProductQuery) -> PublicProductPage:
        products, total = await self.repository.list_products(query)
        return PublicProductPage(
            items=[self._product_summary(product, query.locale) for product in products],
            pagination=PaginationMetadata(
                page=query.page,
                page_size=query.page_size,
                total=total,
                total_pages=ceil(total / query.page_size) if total else 0,
            ),
        )

    async def product(self, slug: str, locale: Locale) -> PublicProductDetail:
        product = await self.repository.get_product_by_slug(slug, locale.value)
        if product is None:
            raise ApiError(
                status_code=404,
                code="PRODUCT_NOT_FOUND",
                message="The product was not found.",
            )
        translation = self._translation(product, locale)
        summary = self._product_summary(product, locale)
        specifications: list[PublicSpecificationResponse] = []
        for item in product.specifications:
            localized = next(
                (candidate for candidate in item.translations if candidate.locale == locale),
                None,
            )
            if localized is None:
                continue
            specifications.append(
                PublicSpecificationResponse(
                    key=item.key,
                    label=localized.label,
                    value=localized.display_value_override or item.value,
                    unit=item.unit,
                    is_highlighted=item.is_highlighted,
                )
            )
        return PublicProductDetail(
            **summary.model_dump(),
            description=translation.description,
            meta_title=translation.meta_title,
            meta_description=translation.meta_description,
            specifications=specifications,
            media=[
                self._media_response(item, locale)
                for item in product.media
                if item.approval_status == "approved"
            ],
        )

    def _product_summary(self, product: Product, locale: Locale) -> PublicProductSummary:
        translation = self._translation(product, locale)
        categories = [
            response
            for link in product.category_links
            if link.category.status == PublicationStatus.PUBLISHED
            and (response := self._category_response(link.category, locale)) is not None
        ]
        return PublicProductSummary(
            sku=product.sku,
            slug=product.slug,
            name=translation.name,
            summary=translation.summary,
            oem_available=product.oem_available,
            featured=product.featured,
            categories=categories,
            primary_media=next(
                (
                    self._media_response(item, locale)
                    for item in product.media
                    if item.approval_status == "approved" and item.is_primary
                ),
                None,
            ),
        )

    def _media_response(self, media: ProductMedia, locale: Locale) -> PublicMediaResponse:
        return PublicMediaResponse(
            alt_text=media.alt_vi if locale == Locale.VI else media.alt_en,
            is_primary=media.is_primary,
            variants=[
                PublicMediaVariantResponse(
                    width=int(metadata["width"]),
                    height=int(metadata["height"]),
                    url=f"{self.public_media_base_url}/{media.id}/{name}",
                )
                for name, metadata in sorted(
                    media.variants.items(), key=lambda variant: int(variant[1]["width"])
                )
            ],
        )

    @staticmethod
    def _translation(product: Product, locale: Locale) -> ProductTranslation:
        translation = next(
            (item for item in product.translations if item.locale == locale),
            None,
        )
        if translation is None:
            raise ApiError(
                status_code=404,
                code="PRODUCT_NOT_FOUND",
                message="The product was not found.",
            )
        return translation

    @staticmethod
    def _category_response(
        category: ProductCategory, locale: Locale
    ) -> PublicCategoryResponse | None:
        translation = next(
            (item for item in category.translations if item.locale == locale),
            None,
        )
        if translation is None:
            return None
        return PublicCategoryResponse(
            slug=category.slug,
            name=translation.name,
            description=translation.description,
            meta_title=translation.meta_title,
            meta_description=translation.meta_description,
        )
