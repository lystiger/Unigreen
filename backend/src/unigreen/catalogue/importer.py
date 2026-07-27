from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
from uuid import uuid4

from pydantic import BaseModel, Field, model_validator
from sqlalchemy.exc import IntegrityError

from unigreen.catalogue.domain import normalize_sku, normalize_slug, normalize_specification_key
from unigreen.catalogue.models import (
    Product,
    ProductCategory,
    ProductCategoryLink,
    ProductCategoryTranslation,
    ProductSpecification,
    ProductSpecificationTranslation,
    ProductTranslation,
)
from unigreen.catalogue.schemas import (
    CategoryTranslationInput,
    ProductTranslationInput,
    SpecificationInput,
)
from unigreen.db import session_factory
from unigreen.domain.enums import PublicationStatus


class DraftCategoryImport(BaseModel):
    slug: str = Field(min_length=1, max_length=160)
    parent_slug: str | None = Field(default=None, min_length=1, max_length=160)
    sort_order: int = Field(default=0, ge=0)
    translations: list[CategoryTranslationInput] = Field(min_length=1, max_length=2)


class DraftProductImport(BaseModel):
    sku: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=160)
    barcode: str | None = Field(default=None, max_length=100)
    oem_available: bool = False
    featured: bool = False
    sort_order: int = Field(default=0, ge=0)
    category_slugs: list[str] = Field(default_factory=list)
    translations: list[ProductTranslationInput] = Field(min_length=1, max_length=2)
    specifications: list[SpecificationInput] = Field(default_factory=list, max_length=100)


class CatalogueDraftManifest(BaseModel):
    format_version: int = Field(ge=1, le=1)
    approval_reference: str | None = Field(default=None, max_length=500)
    categories: list[DraftCategoryImport] = Field(default_factory=list)
    products: list[DraftProductImport] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_references_and_uniqueness(self) -> CatalogueDraftManifest:
        category_slugs = [normalize_slug(item.slug) for item in self.categories]
        if any(not slug for slug in category_slugs):
            raise ValueError("Every category slug must contain letters or numbers.")
        if len(set(category_slugs)) != len(category_slugs):
            raise ValueError("Category slugs must be unique after normalization.")

        known_categories = set(category_slugs)
        parents: dict[str, str] = {}
        for category in self.categories:
            locales = [translation.locale for translation in category.translations]
            if len(set(locales)) != len(locales):
                raise ValueError(f"Category {category.slug} repeats a translation locale.")
            if category.parent_slug is not None:
                parent_slug = normalize_slug(category.parent_slug)
                if parent_slug not in known_categories:
                    raise ValueError(f"Unknown parent category slug: {category.parent_slug}")
                if parent_slug == normalize_slug(category.slug):
                    raise ValueError("A category cannot be its own parent.")
                parents[normalize_slug(category.slug)] = parent_slug

        for category_slug in category_slugs:
            visited: set[str] = set()
            current: str | None = category_slug
            while current is not None:
                if current in visited:
                    raise ValueError("Category parent relationships must not contain a cycle.")
                visited.add(current)
                current = parents.get(current)

        product_skus = [normalize_sku(item.sku) for item in self.products]
        product_slugs = [normalize_slug(item.slug) for item in self.products]
        if any(not slug for slug in product_slugs):
            raise ValueError("Every product slug must contain letters or numbers.")
        if len(set(product_skus)) != len(product_skus):
            raise ValueError("Product SKUs must be unique after normalization.")
        if len(set(product_slugs)) != len(product_slugs):
            raise ValueError("Product slugs must be unique after normalization.")
        product_barcodes = [
            item.barcode.strip() for item in self.products if item.barcode and item.barcode.strip()
        ]
        if len(set(product_barcodes)) != len(product_barcodes):
            raise ValueError("Product barcodes must be unique.")

        for product in self.products:
            locales = [translation.locale for translation in product.translations]
            if len(set(locales)) != len(locales):
                raise ValueError(f"Product {product.sku} repeats a translation locale.")
            normalized_categories = [normalize_slug(slug) for slug in product.category_slugs]
            unknown = set(normalized_categories) - known_categories
            if unknown:
                raise ValueError(f"Unknown product category slugs: {', '.join(sorted(unknown))}")
            if len(set(normalized_categories)) != len(normalized_categories):
                raise ValueError(f"Product {product.sku} repeats a category.")
            specification_keys = [
                normalize_specification_key(specification.key)
                for specification in product.specifications
            ]
            if any(not key for key in specification_keys):
                raise ValueError(f"Product {product.sku} has an invalid specification key.")
            if len(set(specification_keys)) != len(specification_keys):
                raise ValueError(f"Product {product.sku} repeats a specification key.")
            for specification in product.specifications:
                specification_locales = [
                    translation.locale for translation in specification.translations
                ]
                if len(set(specification_locales)) != len(specification_locales):
                    raise ValueError(
                        f"Product {product.sku} repeats a specification translation locale."
                    )
        return self


def load_manifest(path: Path) -> CatalogueDraftManifest:
    return CatalogueDraftManifest.model_validate_json(path.read_text(encoding="utf-8"))


def build_draft_entities(
    manifest: CatalogueDraftManifest,
) -> tuple[list[ProductCategory], list[Product]]:
    categories_by_slug: dict[str, ProductCategory] = {}
    for category_item in manifest.categories:
        slug = normalize_slug(category_item.slug)
        categories_by_slug[slug] = ProductCategory(
            id=uuid4(),
            slug=slug,
            status=PublicationStatus.DRAFT,
            sort_order=category_item.sort_order,
            version=1,
            translations=[
                ProductCategoryTranslation(**translation.model_dump())
                for translation in category_item.translations
            ],
        )

    for category_item in manifest.categories:
        if category_item.parent_slug is not None:
            category = categories_by_slug[normalize_slug(category_item.slug)]
            category.parent_id = categories_by_slug[normalize_slug(category_item.parent_slug)].id

    products: list[Product] = []
    for product_item in manifest.products:
        specifications = [
            ProductSpecification(
                id=uuid4(),
                key=normalize_specification_key(specification.key),
                value=specification.value.strip(),
                unit=specification.unit.strip() if specification.unit else None,
                sort_order=specification.sort_order,
                is_highlighted=specification.is_highlighted,
                translations=[
                    ProductSpecificationTranslation(**translation.model_dump())
                    for translation in specification.translations
                ],
            )
            for specification in product_item.specifications
        ]
        products.append(
            Product(
                id=uuid4(),
                sku=normalize_sku(product_item.sku),
                slug=normalize_slug(product_item.slug),
                barcode=product_item.barcode.strip() if product_item.barcode else None,
                status=PublicationStatus.DRAFT,
                oem_available=product_item.oem_available,
                featured=product_item.featured,
                sort_order=product_item.sort_order,
                version=1,
                translations=[
                    ProductTranslation(**translation.model_dump())
                    for translation in product_item.translations
                ],
                category_links=[
                    ProductCategoryLink(
                        category_id=categories_by_slug[normalize_slug(slug)].id,
                        sort_order=index,
                    )
                    for index, slug in enumerate(product_item.category_slugs)
                ],
                specifications=specifications,
            )
        )

    return list(categories_by_slug.values()), products


async def import_drafts(manifest: CatalogueDraftManifest) -> tuple[int, int]:
    categories, products = build_draft_entities(manifest)
    async with session_factory() as session:
        session.add_all([*categories, *products])
        try:
            await session.commit()
        except IntegrityError as exc:
            await session.rollback()
            raise ValueError(
                "Import conflicts with existing catalogue slugs, SKUs, or barcodes."
            ) from exc
    return len(categories), len(products)


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Validate or atomically import catalogue records as drafts. "
            "This command never publishes content or media."
        )
    )
    parser.add_argument("--input", type=Path, required=True, help="UTF-8 JSON manifest")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate and build the draft records without writing to PostgreSQL",
    )
    args = parser.parse_args()

    try:
        manifest = load_manifest(args.input)
        categories, products = build_draft_entities(manifest)
        if args.check:
            print(f"Valid draft manifest: {len(categories)} categories, {len(products)} products.")
            return
        category_count, product_count = asyncio.run(import_drafts(manifest))
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        parser.error(str(exc))

    print(f"Imported {category_count} categories and {product_count} products as drafts.")
