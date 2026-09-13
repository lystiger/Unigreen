from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from unigreen.domain.enums import Locale, PublicationStatus


class CategoryTranslationInput(BaseModel):
    locale: Locale
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    meta_title: str | None = Field(default=None, max_length=255)
    meta_description: str | None = Field(default=None, max_length=500)


class CategoryCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=160)
    parent_id: UUID | None = None
    sort_order: int = Field(default=0, ge=0)
    translations: list[CategoryTranslationInput] = Field(min_length=1, max_length=2)

    @field_validator("translations")
    @classmethod
    def unique_locales(
        cls, value: list[CategoryTranslationInput]
    ) -> list[CategoryTranslationInput]:
        if len({item.locale for item in value}) != len(value):
            raise ValueError("Translation locales must be unique.")
        return value


class CategoryUpdate(BaseModel):
    version: int = Field(ge=1)
    slug: str | None = Field(default=None, min_length=1, max_length=160)
    parent_id: UUID | None = None
    sort_order: int | None = Field(default=None, ge=0)
    translations: list[CategoryTranslationInput] | None = Field(
        default=None, min_length=1, max_length=2
    )


class CategoryTranslationResponse(CategoryTranslationInput):
    pass


class CategoryResponse(BaseModel):
    id: UUID
    slug: str
    status: PublicationStatus
    parent_id: UUID | None
    sort_order: int
    version: int
    translations: list[CategoryTranslationResponse]


class ProductTranslationInput(BaseModel):
    locale: Locale
    name: str = Field(min_length=1, max_length=200)
    summary: str = Field(min_length=1, max_length=5000)
    description: str | None = Field(default=None, max_length=20000)
    meta_title: str | None = Field(default=None, max_length=255)
    meta_description: str | None = Field(default=None, max_length=500)


def normalize_pack_options(value: list[str]) -> list[str]:
    normalized = [item.strip() for item in value]
    if any(not item for item in normalized):
        raise ValueError("Pack options cannot be blank.")
    if len({item.casefold() for item in normalized}) != len(normalized):
        raise ValueError("Pack options must be unique.")
    return normalized


class ProductCreate(BaseModel):
    """A new catalogue entry presenting one UniOps canonical product.

    There is no `sku`: the SKU is copied from the canonical product. Unknown
    fields are rejected so a client still sending one is told immediately.
    """

    model_config = ConfigDict(extra="forbid")

    canonical_product_id: UUID
    slug: str = Field(min_length=1, max_length=160)
    barcode: str | None = Field(default=None, max_length=100)
    oem_available: bool = False
    featured: bool = False
    pack_options: list[str] = Field(default_factory=list, max_length=20)
    sort_order: int = Field(default=0, ge=0)
    category_ids: list[UUID] = Field(default_factory=list)
    translations: list[ProductTranslationInput] = Field(min_length=1, max_length=2)

    @field_validator("category_ids")
    @classmethod
    def unique_categories(cls, value: list[UUID]) -> list[UUID]:
        if len(set(value)) != len(value):
            raise ValueError("Category IDs must be unique.")
        return value

    @field_validator("translations")
    @classmethod
    def unique_translation_locales(
        cls, value: list[ProductTranslationInput]
    ) -> list[ProductTranslationInput]:
        if len({item.locale for item in value}) != len(value):
            raise ValueError("Translation locales must be unique.")
        return value

    @field_validator("pack_options")
    @classmethod
    def valid_pack_options(cls, value: list[str]) -> list[str]:
        return normalize_pack_options(value)


class ProductUpdate(BaseModel):
    version: int = Field(ge=1)
    # Accepted only for an unmapped legacy entry. A mapped entry's SKU belongs to
    # UniOps; the mapping itself changes only through the map and unmap actions.
    sku: str | None = Field(default=None, min_length=1, max_length=100)
    slug: str | None = Field(default=None, min_length=1, max_length=160)
    barcode: str | None = Field(default=None, max_length=100)
    oem_available: bool | None = None
    featured: bool | None = None
    pack_options: list[str] | None = Field(default=None, max_length=20)
    sort_order: int | None = Field(default=None, ge=0)
    category_ids: list[UUID] | None = None
    translations: list[ProductTranslationInput] | None = None

    @field_validator("pack_options")
    @classmethod
    def valid_pack_options(cls, value: list[str] | None) -> list[str] | None:
        return normalize_pack_options(value) if value is not None else None


class SpecificationTranslationInput(BaseModel):
    locale: Locale
    label: str = Field(min_length=1, max_length=200)
    display_value_override: str | None = Field(default=None, max_length=500)


class SpecificationInput(BaseModel):
    key: str = Field(min_length=1, max_length=100)
    value: str = Field(min_length=1, max_length=500)
    unit: str | None = Field(default=None, max_length=50)
    sort_order: int = Field(default=0, ge=0)
    is_highlighted: bool = False
    translations: list[SpecificationTranslationInput] = Field(min_length=1, max_length=2)


class SpecificationReplace(BaseModel):
    version: int = Field(ge=1)
    specifications: list[SpecificationInput] = Field(max_length=100)

    @field_validator("specifications")
    @classmethod
    def unique_keys(cls, value: list[SpecificationInput]) -> list[SpecificationInput]:
        if len({item.key for item in value}) != len(value):
            raise ValueError("Specification keys must be unique.")
        return value


class ProductResponse(BaseModel):
    id: UUID
    canonical_product_id: UUID | None = None
    is_mapped: bool = False
    # For a mapped entry, a read-only copy of the UniOps SKU.
    sku: str
    slug: str
    barcode: str | None
    status: PublicationStatus
    oem_available: bool
    featured: bool
    pack_options: list[str]
    sort_order: int
    version: int
    category_ids: list[UUID]
    translations: list[ProductTranslationInput]
    specifications: list[SpecificationInput]


class ProductMapRequest(BaseModel):
    canonical_product_id: UUID


class CanonicalProductResponse(BaseModel):
    """A UniOps canonical product as shown to catalogue staff while mapping."""

    id: UUID
    sku: str
    name: str
    unit: str
    category: str
    status: Literal["active", "discontinued"]
    specifications: dict[str, Any]
    easybooks_code: str | None
    easybooks_material_goods_id: str | None
    # The catalogue entry already presenting this product, if any.
    mapped_catalogue_product_id: UUID | None
