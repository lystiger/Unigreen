from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from sqlalchemy import select

from unigreen.api.errors import ApiError
from unigreen.catalogue.models import (
    Product,
    ProductCategory,
    ProductCategoryLink,
    ProductCategoryTranslation,
    ProductSpecification,
    ProductSpecificationTranslation,
    ProductTranslation,
)
from unigreen.catalogue.public_repository import (
    PublicCatalogueRepository,
    _escape_like,
)
from unigreen.catalogue.public_schemas import PublicProductQuery, PublicProductSort
from unigreen.catalogue.public_service import PublicCatalogueService
from unigreen.domain.enums import Locale, PublicationStatus


def category(
    *,
    slug: str = "tissue",
    status: PublicationStatus = PublicationStatus.PUBLISHED,
    locales: tuple[Locale, ...] = (Locale.VI, Locale.EN),
) -> ProductCategory:
    return ProductCategory(
        id=uuid4(),
        slug=slug,
        status=status,
        sort_order=0,
        version=1,
        translations=[
            ProductCategoryTranslation(
                locale=locale,
                name="Khăn giấy" if locale == Locale.VI else "Tissue",
                description=None,
                meta_title=None,
                meta_description=None,
            )
            for locale in locales
        ],
        product_links=[],
    )


def product(
    linked_categories: list[ProductCategory] | None = None,
    *,
    locales: tuple[Locale, ...] = (Locale.VI, Locale.EN),
) -> Product:
    linked_categories = linked_categories or []
    item = Product(
        id=uuid4(),
        sku="UG-001",
        slug="bathroom-tissue",
        status=PublicationStatus.PUBLISHED,
        oem_available=True,
        featured=True,
        sort_order=0,
        version=1,
        translations=[
            ProductTranslation(
                locale=locale,
                name="Giấy vệ sinh" if locale == Locale.VI else "Bathroom tissue",
                summary="Mô tả" if locale == Locale.VI else "Summary",
                description="Chi tiết" if locale == Locale.VI else "Details",
                meta_title=None,
                meta_description=None,
            )
            for locale in locales
        ],
        category_links=[],
        specifications=[
            ProductSpecification(
                id=uuid4(),
                key="basis_weight",
                value="15",
                unit="g/m²",
                sort_order=0,
                is_highlighted=True,
                translations=[
                    ProductSpecificationTranslation(
                        locale=Locale.VI,
                        label="Định lượng",
                        display_value_override="15 ± 1",
                    ),
                    ProductSpecificationTranslation(
                        locale=Locale.EN,
                        label="Basis weight",
                        display_value_override=None,
                    ),
                ],
            )
        ],
    )
    item.category_links = [
        ProductCategoryLink(
            category_id=linked.id,
            sort_order=index,
            category=linked,
            product=item,
        )
        for index, linked in enumerate(linked_categories)
    ]
    return item


class FakePublicCatalogueRepository:
    def __init__(
        self,
        *,
        categories: list[ProductCategory] | None = None,
        products: list[Product] | None = None,
    ) -> None:
        self.categories = categories or []
        self.product_items = products or []

    async def list_categories(self, locale: str) -> list[ProductCategory]:
        return self.categories

    async def list_products(self, query: PublicProductQuery) -> tuple[list[Product], int]:
        return self.product_items, len(self.product_items)

    async def get_product_by_slug(self, slug: str, locale: str) -> Product | None:
        return next((item for item in self.product_items if item.slug == slug), None)


@pytest.mark.asyncio
async def test_public_catalogue_localizes_and_hides_invalid_category_links() -> None:
    published = category()
    draft = category(slug="draft", status=PublicationStatus.DRAFT)
    missing_locale = category(slug="vi-only", locales=(Locale.VI,))
    repository = FakePublicCatalogueRepository(
        categories=[published, missing_locale],
        products=[product([published, draft, missing_locale])],
    )
    service = PublicCatalogueService(repository)  # type: ignore[arg-type]

    categories = await service.categories(Locale.EN)
    assert [item.slug for item in categories] == ["tissue"]

    page = await service.products(PublicProductQuery(locale=Locale.EN, page=2, page_size=1))
    assert page.pagination.model_dump() == {
        "page": 2,
        "page_size": 1,
        "total": 1,
        "total_pages": 1,
    }
    assert page.items[0].name == "Bathroom tissue"
    assert [item.slug for item in page.items[0].categories] == ["tissue"]
    assert "id" not in page.items[0].model_dump()


@pytest.mark.asyncio
async def test_public_product_detail_localizes_specs_and_uses_display_override() -> None:
    service = PublicCatalogueService(
        FakePublicCatalogueRepository(products=[product([category()])])  # type: ignore[arg-type]
    )

    detail = await service.product("bathroom-tissue", Locale.VI)

    assert detail.description == "Chi tiết"
    assert detail.specifications[0].model_dump() == {
        "key": "basis_weight",
        "label": "Định lượng",
        "value": "15 ± 1",
        "unit": "g/m²",
        "is_highlighted": True,
    }


@pytest.mark.asyncio
async def test_public_product_missing_or_without_requested_locale_is_not_found() -> None:
    service = PublicCatalogueService(
        FakePublicCatalogueRepository(products=[product(locales=(Locale.VI,))])  # type: ignore[arg-type]
    )

    with pytest.raises(ApiError) as missing:
        await service.product("unknown", Locale.EN)
    assert missing.value.code == "PRODUCT_NOT_FOUND"

    with pytest.raises(ApiError) as untranslated:
        await service.product("bathroom-tissue", Locale.EN)
    assert untranslated.value.code == "PRODUCT_NOT_FOUND"


def test_public_query_filters_escape_wildcards_and_use_allowlisted_sorts() -> None:
    assert _escape_like(r"50%_off\sale") == r"50\%\_off\\sale"
    base = select(Product).join(ProductTranslation)
    filtered = PublicCatalogueRepository._apply_product_filters(
        base,
        PublicProductQuery(
            locale=Locale.EN,
            category="tissue",
            q=" 50%_ ",
            featured=False,
        ),
    )
    compiled = str(filtered)
    assert "product_categories.slug" in compiled
    assert "products.featured" in compiled
    assert "lower(product_translations.name) LIKE lower(" in compiled

    assert "ORDER BY product_translations.name, products.sku" in str(
        PublicCatalogueRepository._apply_sort(base, PublicProductSort.NAME)
    )
    assert "products.published_at DESC NULLS LAST" in str(
        PublicCatalogueRepository._apply_sort(base, PublicProductSort.NEWEST)
    )
    assert "products.featured DESC" in str(
        PublicCatalogueRepository._apply_sort(base, PublicProductSort.FEATURED)
    )


@pytest.mark.asyncio
async def test_public_repository_executes_published_localized_queries() -> None:
    published_category = category()
    published_product = product([published_category])
    category_scalars = MagicMock()
    category_scalars.unique.return_value = [published_category]
    product_scalars = MagicMock()
    product_scalars.unique.return_value = [published_product]
    session = MagicMock()
    session.scalars = AsyncMock(side_effect=[category_scalars, product_scalars])
    session.scalar = AsyncMock(side_effect=[1, published_product])
    repository = PublicCatalogueRepository(session)

    assert await repository.list_categories("en") == [published_category]
    products, total = await repository.list_products(
        PublicProductQuery(locale=Locale.EN, q="tissue")
    )
    assert products == [published_product]
    assert total == 1
    assert await repository.get_product_by_slug("bathroom-tissue", "en") is published_product

    statements = [
        str(call.args[0])
        for call in [*session.scalars.await_args_list, *session.scalar.await_args_list]
    ]
    assert all(".status" in statement for statement in statements)
