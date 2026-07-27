from __future__ import annotations

from uuid import UUID, uuid4

import pytest
from sqlalchemy.exc import IntegrityError

from unigreen.api.errors import ApiError
from unigreen.audit.models import AuditEvent
from unigreen.catalogue.domain import (
    check_category_publication,
    check_product_publication,
    normalize_sku,
    normalize_slug,
    normalize_specification_key,
)
from unigreen.catalogue.models import (
    Product,
    ProductCategory,
    ProductCategoryLink,
    ProductCategoryTranslation,
    ProductSpecification,
    ProductSpecificationTranslation,
    ProductTranslation,
)
from unigreen.catalogue.responses import category_response, product_response
from unigreen.catalogue.schemas import (
    CategoryCreate,
    CategoryTranslationInput,
    CategoryUpdate,
    ProductCreate,
    ProductTranslationInput,
    ProductUpdate,
    SpecificationInput,
    SpecificationReplace,
    SpecificationTranslationInput,
)
from unigreen.catalogue.service import CatalogueService
from unigreen.domain.enums import Locale, PublicationStatus


class FakeCatalogueRepository:
    def __init__(self) -> None:
        self.categories: dict[UUID, ProductCategory] = {}
        self.products: dict[UUID, Product] = {}
        self.audits: list[AuditEvent] = []
        self.commits = 0
        self.commit_error: IntegrityError | None = None

    async def list_categories(self) -> list[ProductCategory]:
        return list(self.categories.values())

    async def get_category(self, category_id: UUID) -> ProductCategory | None:
        return self.categories.get(category_id)

    async def list_products(self) -> list[Product]:
        return list(self.products.values())

    async def get_product(self, product_id: UUID) -> Product | None:
        return self.products.get(product_id)

    async def categories_exist(self, category_ids: list[UUID]) -> bool:
        return all(item in self.categories for item in category_ids)

    def add(self, entity: object) -> None:
        if isinstance(entity, ProductCategory):
            entity.id = entity.id or uuid4()
            self.categories[entity.id] = entity
        elif isinstance(entity, Product):
            entity.id = entity.id or uuid4()
            self.products[entity.id] = entity

    def add_all(self, entities: list[object]) -> None:
        for entity in entities:
            self.add(entity)

    async def delete_product_links(self, product_id: UUID) -> None:
        self.products[product_id].category_links = []

    async def delete_specifications(self, product_id: UUID) -> None:
        self.products[product_id].specifications = []

    async def delete(self, entity: object) -> None:
        if isinstance(entity, ProductCategory):
            self.categories.pop(entity.id)
        elif isinstance(entity, Product):
            self.products.pop(entity.id)

    def add_audit(self, event: AuditEvent) -> None:
        self.audits.append(event)

    async def commit(self) -> None:
        self.commits += 1
        if self.commit_error:
            raise self.commit_error

    async def refresh(self, entity: object) -> None:
        return None


def category_translations() -> list[CategoryTranslationInput]:
    return [
        CategoryTranslationInput(locale=Locale.VI, name="Khăn giấy"),
        CategoryTranslationInput(locale=Locale.EN, name="Tissue"),
    ]


def product_translations() -> list[ProductTranslationInput]:
    return [
        ProductTranslationInput(
            locale=Locale.VI,
            name="Giấy vệ sinh",
            summary="Mô tả sản phẩm đã xác minh.",
        ),
        ProductTranslationInput(
            locale=Locale.EN,
            name="Bathroom tissue",
            summary="Verified product summary.",
        ),
    ]


def specification_input(key: str = "basis weight") -> SpecificationInput:
    return SpecificationInput(
        key=key,
        value="15",
        unit="g/m²",
        sort_order=0,
        is_highlighted=True,
        translations=[
            SpecificationTranslationInput(locale=Locale.VI, label="Định lượng"),
            SpecificationTranslationInput(locale=Locale.EN, label="Basis weight"),
        ],
    )


def complete_product(category_id: UUID) -> Product:
    return Product(
        id=uuid4(),
        sku="UG-001",
        slug="bathroom-tissue",
        status=PublicationStatus.DRAFT,
        oem_available=True,
        featured=False,
        sort_order=0,
        version=1,
        translations=[ProductTranslation(**item.model_dump()) for item in product_translations()],
        category_links=[ProductCategoryLink(category_id=category_id, sort_order=0)],
        specifications=[
            ProductSpecification(
                id=uuid4(),
                key="basis_weight",
                value="15",
                unit="g/m²",
                sort_order=0,
                is_highlighted=True,
                translations=[
                    ProductSpecificationTranslation(**item.model_dump())
                    for item in specification_input().translations
                ],
            )
        ],
    )


def test_catalogue_normalization_is_stable() -> None:
    assert normalize_slug("  Sản phẩm Mới  ") == "san-pham-moi"
    assert normalize_slug("!!!") == ""
    assert normalize_sku(" ug  001 ") == "UG-001"
    assert normalize_specification_key("Basis Weight (%)") == "basis_weight"


def test_publication_checks_report_exact_missing_fields() -> None:
    category = ProductCategory(
        id=uuid4(),
        slug="tissue",
        status=PublicationStatus.DRAFT,
        sort_order=0,
        version=1,
        translations=[ProductCategoryTranslation(locale=Locale.VI, name="Khăn giấy")],
    )
    check = check_category_publication(category)
    assert check.valid is False
    assert check.missing == ("translations.en.name",)

    product = Product(
        id=uuid4(),
        sku="",
        slug="",
        status=PublicationStatus.DRAFT,
        oem_available=False,
        featured=False,
        sort_order=0,
        version=1,
        translations=[],
        category_links=[],
        specifications=[],
    )
    missing = check_product_publication(product, has_primary_media=False).missing
    assert "translations.vi.name" in missing
    assert "translations.en.summary" in missing
    assert {"sku", "slug", "categories", "specifications", "primary_media"} <= set(missing)


@pytest.mark.asyncio
async def test_category_lifecycle_and_responses_are_audited() -> None:
    repository = FakeCatalogueRepository()
    service = CatalogueService(repository)  # type: ignore[arg-type]
    actor_id = uuid4()

    category = await service.create_category(
        CategoryCreate(
            slug="Khăn Giấy",
            sort_order=2,
            translations=category_translations(),
        )
    )
    assert category.slug == "khan-giay"
    assert category_response(category).translations[1].name == "Tissue"

    category = await service.update_category(
        category.id,
        CategoryUpdate(
            version=1,
            sort_order=1,
            translations=category_translations(),
        ),
    )
    assert category.version == 2
    assert category.sort_order == 1

    category = await service.publish_category(
        category.id, actor_id=actor_id, request_id="request-1"
    )
    assert category.status == PublicationStatus.PUBLISHED
    assert repository.audits[-1].action == "category.published"

    category = await service.unpublish_category(
        category.id, actor_id=actor_id, request_id="request-2"
    )
    assert category.status == PublicationStatus.UNPUBLISHED
    assert repository.audits[-1].request_id == "request-2"

    with pytest.raises(ApiError) as cannot_delete:
        await service.delete_category(category.id, actor_id=actor_id, request_id="request-3")
    assert cannot_delete.value.code == "PUBLISHED_RECORD_CANNOT_BE_DELETED"


@pytest.mark.asyncio
async def test_category_validation_and_version_conflicts() -> None:
    repository = FakeCatalogueRepository()
    service = CatalogueService(repository)  # type: ignore[arg-type]
    category = await service.create_category(
        CategoryCreate(slug="tissue", translations=category_translations())
    )

    with pytest.raises(ApiError) as stale:
        await service.update_category(category.id, CategoryUpdate(version=99, sort_order=1))
    assert stale.value.code == "VERSION_CONFLICT"

    with pytest.raises(ApiError) as self_parent:
        await service.update_category(
            category.id,
            CategoryUpdate(version=1, parent_id=category.id),
        )
    assert self_parent.value.code == "VALIDATION_ERROR"

    category.status = PublicationStatus.PUBLISHED
    with pytest.raises(ApiError) as immutable:
        await service.update_category(
            category.id,
            CategoryUpdate(version=1, slug="changed"),
        )
    assert immutable.value.code == "PUBLISHED_SLUG_IMMUTABLE"

    category.translations = category.translations[:1]
    with pytest.raises(ApiError) as incomplete:
        await service.publish_category(category.id, actor_id=uuid4(), request_id="request")
    assert incomplete.value.code == "PUBLICATION_REQUIREMENTS_NOT_MET"


@pytest.mark.asyncio
async def test_draft_category_can_be_deleted() -> None:
    repository = FakeCatalogueRepository()
    service = CatalogueService(repository)  # type: ignore[arg-type]
    category = await service.create_category(
        CategoryCreate(slug="draft", translations=category_translations())
    )

    await service.delete_category(category.id, actor_id=uuid4(), request_id="delete-request")

    assert category.id not in repository.categories
    assert repository.audits[-1].action == "category.deleted"


@pytest.mark.asyncio
async def test_product_lifecycle_specifications_and_response() -> None:
    repository = FakeCatalogueRepository()
    service = CatalogueService(repository)  # type: ignore[arg-type]
    category = ProductCategory(
        id=uuid4(),
        slug="tissue",
        status=PublicationStatus.PUBLISHED,
        sort_order=0,
        version=1,
        translations=[],
    )
    repository.categories[category.id] = category

    product = await service.create_product(
        ProductCreate(
            sku=" ug  001 ",
            slug="Bathroom Tissue",
            category_ids=[category.id],
            translations=product_translations(),
        )
    )
    assert product.sku == "UG-001"
    assert product.slug == "bathroom-tissue"

    product = await service.replace_specifications(
        product.id,
        SpecificationReplace(
            version=1,
            specifications=[specification_input()],
        ),
    )
    assert product.specifications[0].key == "basis_weight"
    assert product.version == 2

    with pytest.raises(ApiError) as media_required:
        await service.publish_product(product.id, actor_id=uuid4(), request_id="publish")
    assert media_required.value.field_errors["requirements"] == ["primary_media"]

    product = await service.publish_product(
        product.id,
        actor_id=uuid4(),
        request_id="publish",
        has_primary_media=True,
    )
    assert product.status == PublicationStatus.PUBLISHED
    assert product.published_at is not None
    assert product_response(product).specifications[0].translations[1].label == ("Basis weight")

    product = await service.unpublish_product(product.id, actor_id=uuid4(), request_id="unpublish")
    assert product.status == PublicationStatus.UNPUBLISHED
    with pytest.raises(ApiError) as cannot_delete:
        await service.delete_product(product.id, actor_id=uuid4(), request_id="delete")
    assert cannot_delete.value.code == "PUBLISHED_RECORD_CANNOT_BE_DELETED"


@pytest.mark.asyncio
async def test_product_update_and_draft_delete() -> None:
    repository = FakeCatalogueRepository()
    service = CatalogueService(repository)  # type: ignore[arg-type]
    category_id = uuid4()
    second_category_id = uuid4()
    repository.categories[category_id] = ProductCategory(
        id=category_id,
        slug="one",
        status=PublicationStatus.DRAFT,
        sort_order=0,
        version=1,
        translations=[],
    )
    repository.categories[second_category_id] = ProductCategory(
        id=second_category_id,
        slug="two",
        status=PublicationStatus.DRAFT,
        sort_order=0,
        version=1,
        translations=[],
    )
    product = complete_product(category_id)
    repository.products[product.id] = product

    updated = await service.update_product(
        product.id,
        ProductUpdate(
            version=1,
            sku="new sku",
            barcode=" 123 ",
            category_ids=[second_category_id],
            featured=True,
        ),
    )
    assert updated.sku == "NEW-SKU"
    assert updated.barcode == "123"
    assert updated.category_links[0].category_id == second_category_id
    assert updated.version == 2

    await service.delete_product(product.id, actor_id=uuid4(), request_id="delete")
    assert product.id not in repository.products
    assert repository.audits[-1].action == "product.deleted"


@pytest.mark.asyncio
async def test_product_validation_errors_are_specific() -> None:
    repository = FakeCatalogueRepository()
    service = CatalogueService(repository)  # type: ignore[arg-type]
    category_id = uuid4()

    with pytest.raises(ApiError) as missing_category:
        await service.create_product(
            ProductCreate(
                sku="UG-001",
                slug="product",
                category_ids=[category_id],
                translations=product_translations(),
            )
        )
    assert missing_category.value.code == "CATEGORY_NOT_FOUND"

    product = complete_product(category_id)
    repository.categories[category_id] = ProductCategory(
        id=category_id,
        slug="category",
        status=PublicationStatus.DRAFT,
        sort_order=0,
        version=1,
        translations=[],
    )
    repository.products[product.id] = product

    with pytest.raises(ApiError) as stale:
        await service.update_product(product.id, ProductUpdate(version=99, featured=True))
    assert stale.value.code == "VERSION_CONFLICT"

    product.status = PublicationStatus.PUBLISHED
    with pytest.raises(ApiError) as immutable:
        await service.update_product(product.id, ProductUpdate(version=1, slug="changed"))
    assert immutable.value.code == "PUBLISHED_SLUG_IMMUTABLE"

    with pytest.raises(ApiError) as duplicate_spec:
        await service.replace_specifications(
            product.id,
            SpecificationReplace(
                version=1,
                specifications=[
                    specification_input("Basis weight"),
                    specification_input("basis-weight"),
                ],
            ),
        )
    assert duplicate_spec.value.code == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_not_found_and_database_conflicts_map_to_contract_codes() -> None:
    repository = FakeCatalogueRepository()
    service = CatalogueService(repository)  # type: ignore[arg-type]

    with pytest.raises(ApiError) as category_missing:
        await service._category_or_404(uuid4())
    assert category_missing.value.code == "CATEGORY_NOT_FOUND"
    with pytest.raises(ApiError) as product_missing:
        await service._product_or_404(uuid4())
    assert product_missing.value.code == "PRODUCT_NOT_FOUND"

    repository.commit_error = IntegrityError(
        "insert",
        {},
        Exception("duplicate key value violates unique constraint products_sku"),
    )
    with pytest.raises(ApiError) as duplicate:
        await service.create_category(
            CategoryCreate(slug="duplicate", translations=category_translations())
        )
    assert duplicate.value.code == "SKU_ALREADY_EXISTS"
