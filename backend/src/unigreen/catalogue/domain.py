from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from unigreen.catalogue.models import Product, ProductCategory
from unigreen.domain.enums import Locale

_slug_invalid = re.compile(r"[^a-z0-9]+")
_key_invalid = re.compile(r"[^a-z0-9_]+")


def normalize_slug(value: str) -> str:
    ascii_value = (
        unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii").lower()
    )
    return _slug_invalid.sub("-", ascii_value).strip("-")


def normalize_sku(value: str) -> str:
    return re.sub(r"\s+", "-", value.strip().upper())


def normalize_specification_key(value: str) -> str:
    return _key_invalid.sub("_", value.strip().lower()).strip("_")


@dataclass(frozen=True)
class PublicationCheck:
    missing: tuple[str, ...]

    @property
    def valid(self) -> bool:
        return not self.missing


def check_category_publication(category: ProductCategory) -> PublicationCheck:
    locales = {item.locale for item in category.translations if item.name and item.name.strip()}
    missing = [f"translations.{locale.value}.name" for locale in Locale if locale not in locales]
    return PublicationCheck(tuple(missing))


def check_product_publication(product: Product, *, has_primary_media: bool) -> PublicationCheck:
    missing: list[str] = []
    translations = {item.locale: item for item in product.translations}
    for locale in Locale:
        translation = translations.get(locale)
        if translation is None or not translation.name.strip():
            missing.append(f"translations.{locale.value}.name")
        if translation is None or not translation.summary.strip():
            missing.append(f"translations.{locale.value}.summary")
    if not product.sku.strip():
        missing.append("sku")
    if not product.slug.strip():
        missing.append("slug")
    if not product.category_links:
        missing.append("categories")
    if not product.specifications:
        missing.append("specifications")
    if not has_primary_media:
        missing.append("primary_media")
    return PublicationCheck(tuple(missing))
