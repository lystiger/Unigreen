from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

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
from unigreen.catalogue.repository import CatalogueRepository
from unigreen.catalogue.schemas import (
    CategoryCreate,
    CategoryUpdate,
    ProductCreate,
    ProductUpdate,
    SpecificationReplace,
)
from unigreen.domain.enums import PublicationStatus


class CatalogueService:
    def __init__(self, repository: CatalogueRepository) -> None:
        self.repository = repository

    async def create_category(self, payload: CategoryCreate) -> ProductCategory:
        slug = self._valid_slug(payload.slug)
        category = ProductCategory(
            slug=slug,
            parent_id=payload.parent_id,
            sort_order=payload.sort_order,
            status=PublicationStatus.DRAFT,
            version=1,
            translations=[
                ProductCategoryTranslation(**item.model_dump()) for item in payload.translations
            ],
        )
        self.repository.add(category)
        await self._commit_with_conflict_mapping()
        return category

    async def update_category(self, category_id: UUID, payload: CategoryUpdate) -> ProductCategory:
        category = await self._category_or_404(category_id)
        self._check_version(category.version, payload.version)
        fields = payload.model_fields_set
        if "slug" in fields and payload.slug is not None:
            new_slug = self._valid_slug(payload.slug)
            if category.status == PublicationStatus.PUBLISHED and new_slug != category.slug:
                raise ApiError(
                    status_code=409,
                    code="PUBLISHED_SLUG_IMMUTABLE",
                    message="A published category slug cannot be changed.",
                )
            category.slug = new_slug
        if "parent_id" in fields:
            if payload.parent_id == category.id:
                raise ApiError(
                    status_code=422,
                    code="VALIDATION_ERROR",
                    message="A category cannot be its own parent.",
                    field_errors={"parent_id": ["Choose a different parent."]},
                )
            category.parent_id = payload.parent_id
        if payload.sort_order is not None:
            category.sort_order = payload.sort_order
        if payload.translations is not None:
            category.translations = [
                ProductCategoryTranslation(**item.model_dump()) for item in payload.translations
            ]
        category.version += 1
        await self._commit_with_conflict_mapping()
        return category

    async def publish_category(
        self,
        category_id: UUID,
        *,
        actor_id: UUID,
        request_id: str,
    ) -> ProductCategory:
        category = await self._category_or_404(category_id)
        check = check_category_publication(category)
        self._require_publication(check.missing)
        category.status = PublicationStatus.PUBLISHED
        category.version += 1
        self._audit(actor_id, "category.published", category.id, request_id)
        await self.repository.commit()
        return category

    async def unpublish_category(
        self,
        category_id: UUID,
        *,
        actor_id: UUID,
        request_id: str,
    ) -> ProductCategory:
        category = await self._category_or_404(category_id)
        category.status = PublicationStatus.UNPUBLISHED
        category.version += 1
        self._audit(actor_id, "category.unpublished", category.id, request_id)
        await self.repository.commit()
        return category

    async def delete_category(self, category_id: UUID, *, actor_id: UUID, request_id: str) -> None:
        category = await self._category_or_404(category_id)
        if category.status != PublicationStatus.DRAFT:
            raise ApiError(
                status_code=409,
                code="PUBLISHED_RECORD_CANNOT_BE_DELETED",
                message="Published category history must be preserved.",
            )
        self._audit(actor_id, "category.deleted", category.id, request_id)
        await self.repository.delete(category)
        await self._commit_with_conflict_mapping()

    async def create_product(self, payload: ProductCreate) -> Product:
        await self._require_categories(payload.category_ids)
        product = Product(
            sku=normalize_sku(payload.sku),
            slug=self._valid_slug(payload.slug),
            barcode=self._normalize_optional(payload.barcode),
            oem_available=payload.oem_available,
            featured=payload.featured,
            sort_order=payload.sort_order,
            status=PublicationStatus.DRAFT,
            version=1,
            translations=[ProductTranslation(**item.model_dump()) for item in payload.translations],
            category_links=[
                ProductCategoryLink(category_id=category_id, sort_order=index)
                for index, category_id in enumerate(payload.category_ids)
            ],
            specifications=[],
        )
        self.repository.add(product)
        await self._commit_with_conflict_mapping()
        return product

    async def update_product(self, product_id: UUID, payload: ProductUpdate) -> Product:
        product = await self._product_or_404(product_id)
        self._check_version(product.version, payload.version)
        fields = payload.model_fields_set
        if payload.sku is not None:
            product.sku = normalize_sku(payload.sku)
        if payload.slug is not None:
            new_slug = self._valid_slug(payload.slug)
            if product.status == PublicationStatus.PUBLISHED and new_slug != product.slug:
                raise ApiError(
                    status_code=409,
                    code="PUBLISHED_SLUG_IMMUTABLE",
                    message="A published product slug cannot be changed.",
                )
            product.slug = new_slug
        if "barcode" in fields:
            product.barcode = self._normalize_optional(payload.barcode)
        if payload.oem_available is not None:
            product.oem_available = payload.oem_available
        if payload.featured is not None:
            product.featured = payload.featured
        if payload.sort_order is not None:
            product.sort_order = payload.sort_order
        if payload.translations is not None:
            product.translations = [
                ProductTranslation(**item.model_dump()) for item in payload.translations
            ]
        if payload.category_ids is not None:
            await self._require_categories(payload.category_ids)
            product.category_links = [
                ProductCategoryLink(category_id=category_id, sort_order=index)
                for index, category_id in enumerate(payload.category_ids)
            ]
        product.version += 1
        await self._commit_with_conflict_mapping()
        return product

    async def replace_specifications(
        self, product_id: UUID, payload: SpecificationReplace
    ) -> Product:
        product = await self._product_or_404(product_id)
        self._check_version(product.version, payload.version)
        normalized_keys = [normalize_specification_key(item.key) for item in payload.specifications]
        if any(not key for key in normalized_keys):
            raise ApiError(
                status_code=422,
                code="VALIDATION_ERROR",
                message="A specification key is invalid.",
            )
        if len(set(normalized_keys)) != len(normalized_keys):
            raise ApiError(
                status_code=422,
                code="VALIDATION_ERROR",
                message="Specification keys must be unique after normalization.",
            )
        product.specifications = [
            ProductSpecification(
                key=normalized_keys[index],
                value=item.value.strip(),
                unit=self._normalize_optional(item.unit),
                sort_order=item.sort_order,
                is_highlighted=item.is_highlighted,
                translations=[
                    ProductSpecificationTranslation(**translation.model_dump())
                    for translation in item.translations
                ],
            )
            for index, item in enumerate(payload.specifications)
        ]
        product.version += 1
        await self._commit_with_conflict_mapping()
        return product

    async def publish_product(
        self,
        product_id: UUID,
        *,
        actor_id: UUID,
        request_id: str,
        has_primary_media: bool = False,
    ) -> Product:
        product = await self._product_or_404(product_id)
        check = check_product_publication(product, has_primary_media=has_primary_media)
        self._require_publication(check.missing)
        product.status = PublicationStatus.PUBLISHED
        product.published_at = datetime.now(UTC)
        product.version += 1
        self._audit(actor_id, "product.published", product.id, request_id)
        await self.repository.commit()
        return product

    async def unpublish_product(
        self,
        product_id: UUID,
        *,
        actor_id: UUID,
        request_id: str,
    ) -> Product:
        product = await self._product_or_404(product_id)
        product.status = PublicationStatus.UNPUBLISHED
        product.version += 1
        self._audit(actor_id, "product.unpublished", product.id, request_id)
        await self.repository.commit()
        return product

    async def delete_product(self, product_id: UUID, *, actor_id: UUID, request_id: str) -> None:
        product = await self._product_or_404(product_id)
        if product.status != PublicationStatus.DRAFT:
            raise ApiError(
                status_code=409,
                code="PUBLISHED_RECORD_CANNOT_BE_DELETED",
                message="Published product history must be preserved.",
            )
        self._audit(actor_id, "product.deleted", product.id, request_id)
        await self.repository.delete(product)
        await self.repository.commit()

    async def _category_or_404(self, category_id: UUID) -> ProductCategory:
        category = await self.repository.get_category(category_id)
        if category is None:
            raise ApiError(
                status_code=404,
                code="CATEGORY_NOT_FOUND",
                message="The category was not found.",
            )
        return category

    async def _product_or_404(self, product_id: UUID) -> Product:
        product = await self.repository.get_product(product_id)
        if product is None:
            raise ApiError(
                status_code=404,
                code="PRODUCT_NOT_FOUND",
                message="The product was not found.",
            )
        return product

    async def _require_categories(self, category_ids: list[UUID]) -> None:
        if not await self.repository.categories_exist(category_ids):
            raise ApiError(
                status_code=422,
                code="CATEGORY_NOT_FOUND",
                message="One or more selected categories do not exist.",
            )

    async def _commit_with_conflict_mapping(self) -> None:
        try:
            await self.repository.commit()
        except IntegrityError as exc:
            message = str(exc.orig).lower()
            code = "CONFLICT"
            if "slug" in message:
                code = "SLUG_ALREADY_EXISTS"
            elif "sku" in message:
                code = "SKU_ALREADY_EXISTS"
            elif "barcode" in message:
                code = "BARCODE_ALREADY_EXISTS"
            raise ApiError(
                status_code=409,
                code=code,
                message="A catalogue value conflicts with an existing record.",
            ) from exc

    def _audit(self, actor_id: UUID, action: str, entity_id: UUID, request_id: str) -> None:
        self.repository.add_audit(
            AuditEvent(
                actor_staff_id=actor_id,
                action=action,
                entity_type=action.split(".", maxsplit=1)[0],
                entity_id=entity_id,
                request_id=request_id,
                change_summary={},
            )
        )

    @staticmethod
    def _check_version(current: int, supplied: int) -> None:
        if current != supplied:
            raise ApiError(
                status_code=409,
                code="VERSION_CONFLICT",
                message="This record was changed by another user.",
            )

    @staticmethod
    def _require_publication(missing: tuple[str, ...]) -> None:
        if missing:
            raise ApiError(
                status_code=422,
                code="PUBLICATION_REQUIREMENTS_NOT_MET",
                message="The record is missing required publication content.",
                field_errors={"requirements": list(missing)},
            )

    @staticmethod
    def _valid_slug(value: str) -> str:
        slug = normalize_slug(value)
        if not slug:
            raise ApiError(
                status_code=422,
                code="VALIDATION_ERROR",
                message="The slug must contain letters or numbers.",
            )
        return slug

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        normalized = value.strip() if value else ""
        return normalized or None
