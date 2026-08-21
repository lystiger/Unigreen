from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from unigreen.catalogue.models import Product

REFERENCE_PATTERN = re.compile(r"^UG-INQ-(\d{4})-(\d{6})$")


def format_inquiry_reference(year: int, sequence_number: int) -> str:
    return f"UG-INQ-{year:04d}-{sequence_number:06d}"


def parse_inquiry_reference(reference: str) -> tuple[int, int]:
    match = REFERENCE_PATTERN.match(reference.strip())
    if not match:
        raise ValueError(f"Invalid inquiry reference format: '{reference}'")
    return int(match.group(1)), int(match.group(2))


def build_product_snapshot(product: Product, media_base_url: str = "") -> dict[str, object]:
    media_base = media_base_url.rstrip("/")
    primary_media_item = next(
        (m for m in product.media if m.is_primary and m.approval_status == "approved"),
        None,
    )
    primary_media_payload: dict[str, object] | None = None
    if primary_media_item is not None:
        prefix = media_base if media_base else "/api/v1/public/media"
        variants_payload = [
            {
                "name": name,
                "width": int(var["width"]),
                "height": int(var["height"]),
                "size_bytes": int(var["size_bytes"]),
                "url": f"{prefix}/{primary_media_item.id}/{name}",
            }
            for name, var in sorted(
                primary_media_item.variants.items(),
                key=lambda item: int(item[1]["width"]),
            )
        ]
        primary_media_payload = {
            "id": str(primary_media_item.id),
            "alt_vi": primary_media_item.alt_vi,
            "alt_en": primary_media_item.alt_en,
            "original_filename": primary_media_item.original_filename,
            "variants": variants_payload,
        }

    return {
        "product_id": str(product.id),
        "sku": product.sku,
        "slug": product.slug,
        "barcode": product.barcode,
        "status": product.status.value,
        "oem_available": product.oem_available,
        "featured": product.featured,
        "translations": {
            item.locale.value: {
                "name": item.name,
                "summary": item.summary,
                "description": item.description,
                "meta_title": item.meta_title,
                "meta_description": item.meta_description,
            }
            for item in product.translations
        },
        "specifications": [
            {
                "key": spec.key,
                "value": spec.value,
                "unit": spec.unit,
                "sort_order": spec.sort_order,
                "is_highlighted": spec.is_highlighted,
                "translations": {
                    st.locale.value: {
                        "label": st.label,
                        "display_value_override": st.display_value_override,
                    }
                    for st in spec.translations
                },
            }
            for spec in product.specifications
        ],
        "categories": [
            {
                "slug": link.category.slug,
                "translations": {ct.locale.value: ct.name for ct in link.category.translations},
            }
            for link in product.category_links
            if link.category is not None
        ],
        "primary_media": primary_media_payload,
        "captured_at": datetime.now(UTC).isoformat(),
    }
