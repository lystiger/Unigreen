"""An in-memory UniOps product master for tests.

It stands in for `UniOpsClient` behind the `CanonicalProductSource` protocol.
The HTTP client itself is tested against UniOps-shaped responses in
test_canonical_product_mapping.py.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID, uuid4

from unigreen.integrations.uniops import CanonicalProduct, CanonicalProductDraft


def canonical_product(
    sku: str = "UG000001",
    name: str = "Khăn giấy lau tay 175gr",
    *,
    product_id: UUID | None = None,
    code: str | None = "TP.KT175",
    status: Literal["active", "discontinued"] = "active",
    specifications: dict[str, Any] | None = None,
) -> CanonicalProduct:
    now = datetime(2026, 9, 13, tzinfo=UTC)
    return CanonicalProduct(
        id=product_id or uuid4(),
        sku=sku,
        name=name,
        unit="Gói",
        category="hand-towel",
        status=status,
        specifications=specifications or {},
        code=code,
        easybooks_material_goods_id=f"eb-{sku}" if code else None,
        created_at=now,
        updated_at=now,
    )


class StubCanonicalProducts:
    def __init__(self, *products: CanonicalProduct) -> None:
        self.products = {product.id: product for product in products}
        self.created: list[CanonicalProductDraft] = []

    async def list_products(
        self, *, search: str | None = None, status: str | None = None
    ) -> list[CanonicalProduct]:
        items = list(self.products.values())
        if search:
            needle = search.casefold()
            items = [
                item
                for item in items
                if needle in item.sku.casefold()
                or needle in item.name.casefold()
                or needle in (item.code or "").casefold()
            ]
        if status:
            items = [item for item in items if item.status == status]
        return items

    async def get_product(self, product_id: UUID) -> CanonicalProduct | None:
        return self.products.get(product_id)

    async def create_product(self, draft: CanonicalProductDraft) -> CanonicalProduct:
        self.created.append(draft)
        product = canonical_product(
            f"UG{len(self.products) + 1:06d}",
            draft.name,
            code=draft.code,
            specifications=draft.specifications,
        )
        self.products[product.id] = product
        return product
