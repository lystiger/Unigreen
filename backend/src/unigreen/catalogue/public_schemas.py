from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field

from unigreen.domain.enums import Locale


class PublicProductSort(StrEnum):
    FEATURED = "featured"
    NAME = "name"
    NEWEST = "newest"


class PublicCategoryResponse(BaseModel):
    slug: str
    name: str
    description: str | None
    meta_title: str | None
    meta_description: str | None


class PublicSpecificationResponse(BaseModel):
    key: str
    label: str
    value: str
    unit: str | None
    is_highlighted: bool


class PublicMediaVariantResponse(BaseModel):
    width: int
    height: int
    url: str


class PublicMediaResponse(BaseModel):
    alt_text: str
    is_primary: bool
    variants: list[PublicMediaVariantResponse]


class PublicProductSummary(BaseModel):
    sku: str
    slug: str
    name: str
    summary: str
    oem_available: bool
    featured: bool
    pack_options: list[str]
    categories: list[PublicCategoryResponse]
    primary_media: PublicMediaResponse | None


class PublicProductDetail(PublicProductSummary):
    description: str | None
    meta_title: str | None
    meta_description: str | None
    specifications: list[PublicSpecificationResponse]
    media: list[PublicMediaResponse]


class PaginationMetadata(BaseModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=50)
    total: int = Field(ge=0)
    total_pages: int = Field(ge=0)


class PublicProductPage(BaseModel):
    items: list[PublicProductSummary]
    pagination: PaginationMetadata


class PublicProductQuery(BaseModel):
    locale: Locale
    category: str | None = Field(default=None, max_length=160)
    q: str | None = Field(default=None, max_length=100)
    featured: bool | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=50)
    sort: PublicProductSort = PublicProductSort.FEATURED
