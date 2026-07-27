from __future__ import annotations

from unigreen.catalogue.models import Product, ProductCategory
from unigreen.catalogue.schemas import (
    CategoryResponse,
    CategoryTranslationResponse,
    ProductResponse,
    ProductTranslationInput,
    SpecificationInput,
    SpecificationTranslationInput,
)


def category_response(category: ProductCategory) -> CategoryResponse:
    return CategoryResponse(
        id=category.id,
        slug=category.slug,
        status=category.status,
        parent_id=category.parent_id,
        sort_order=category.sort_order,
        version=category.version,
        translations=[
            CategoryTranslationResponse(
                locale=item.locale,
                name=item.name,
                description=item.description,
                meta_title=item.meta_title,
                meta_description=item.meta_description,
            )
            for item in category.translations
        ],
    )


def product_response(product: Product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        sku=product.sku,
        slug=product.slug,
        barcode=product.barcode,
        status=product.status,
        oem_available=product.oem_available,
        featured=product.featured,
        sort_order=product.sort_order,
        version=product.version,
        category_ids=[item.category_id for item in product.category_links],
        translations=[
            ProductTranslationInput(
                locale=item.locale,
                name=item.name,
                summary=item.summary,
                description=item.description,
                meta_title=item.meta_title,
                meta_description=item.meta_description,
            )
            for item in product.translations
        ],
        specifications=[
            SpecificationInput(
                key=item.key,
                value=item.value,
                unit=item.unit,
                sort_order=item.sort_order,
                is_highlighted=item.is_highlighted,
                translations=[
                    SpecificationTranslationInput(
                        locale=translation.locale,
                        label=translation.label,
                        display_value_override=translation.display_value_override,
                    )
                    for translation in item.translations
                ],
            )
            for item in product.specifications
        ],
    )
