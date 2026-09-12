from __future__ import annotations

from typing import Any

import httpx
from pydantic import BaseModel, Field


class CanonicalProduct(BaseModel):
    id: str
    code: str = ""
    sku: str
    name: str
    unit: str
    category: str | None = None
    status: str = "active"
    specifications: dict[str, Any] = Field(default_factory=dict)
    easybooks_code: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class CanonicalProductCreatePayload(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    unit: str = Field(min_length=1, max_length=50)
    sku: str | None = Field(default=None, max_length=50)
    code: str | None = Field(default=None, max_length=100)
    category: str | None = Field(default=None, max_length=100)
    status: str = "active"
    specifications: dict[str, Any] = Field(default_factory=dict)
    easybooks_code: str | None = None


class UniOpsClient:
    """Client for communicating with UniOps canonical product master."""

    def __init__(self, base_url: str, api_key: str = "", timeout: float = 10.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    def _headers(self) -> dict[str, str]:
        headers = {"Accept": "application/json"}
        if self.api_key:
            headers["X-UniOps-Key"] = self.api_key
        return headers

    async def list_products(
        self,
        search: str | None = None,
        category: str | None = None,
        status: str | None = None,
    ) -> list[CanonicalProduct]:
        params: dict[str, str] = {}
        if search:
            params["search"] = search
        if category:
            params["category"] = category
        if status:
            params["status"] = status

        async with httpx.AsyncClient(
            base_url=self.base_url,
            timeout=self.timeout,
            headers=self._headers(),
        ) as client:
            resp = await client.get("/api/v1/products", params=params)
            resp.raise_for_status()
            data = resp.json()
            return [CanonicalProduct.model_validate(item) for item in data]

    async def get_product(self, product_id: str) -> CanonicalProduct | None:
        async with httpx.AsyncClient(
            base_url=self.base_url,
            timeout=self.timeout,
            headers=self._headers(),
        ) as client:
            resp = await client.get(f"/api/v1/products/{product_id}")
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return CanonicalProduct.model_validate(resp.json())

    async def get_product_by_sku(self, sku: str) -> CanonicalProduct | None:
        products = await self.list_products(search=sku)
        for p in products:
            if p.sku == sku:
                return p
        return None

    async def create_product(self, payload: CanonicalProductCreatePayload) -> CanonicalProduct:
        async with httpx.AsyncClient(
            base_url=self.base_url,
            timeout=self.timeout,
            headers=self._headers(),
        ) as client:
            resp = await client.post(
                "/api/v1/products",
                json=payload.model_dump(exclude_none=True),
            )
            resp.raise_for_status()
            return CanonicalProduct.model_validate(resp.json())


class FakeUniOpsClient:
    """In-memory client for testing canonical product flows."""

    def __init__(self, products: list[CanonicalProduct] | None = None) -> None:
        self.products: dict[str, CanonicalProduct] = {
            p.id: p for p in (products or [])
        }
        self.next_sku_num = len(self.products) + 1

    async def list_products(
        self,
        search: str | None = None,
        category: str | None = None,
        status: str | None = None,
    ) -> list[CanonicalProduct]:
        items = list(self.products.values())
        if search:
            q = search.lower()
            items = [
                p
                for p in items
                if q in p.name.lower()
                or q in p.sku.lower()
                or (p.category and q in p.category.lower())
            ]
        if category:
            items = [p for p in items if p.category == category]
        if status:
            items = [p for p in items if p.status == status]
        return items

    async def get_product(self, product_id: str) -> CanonicalProduct | None:
        return self.products.get(product_id)

    async def get_product_by_sku(self, sku: str) -> CanonicalProduct | None:
        for p in self.products.values():
            if p.sku == sku:
                return p
        return None

    async def create_product(self, payload: CanonicalProductCreatePayload) -> CanonicalProduct:
        product_id = f"prod-{len(self.products) + 1:04d}"
        sku = payload.sku or f"UG{self.next_sku_num:06d}"
        self.next_sku_num += 1
        prod = CanonicalProduct(
            id=product_id,
            sku=sku,
            name=payload.name,
            unit=payload.unit,
            category=payload.category,
            status=payload.status,
            specifications=payload.specifications,
            easybooks_code=payload.easybooks_code or payload.code,
            code=payload.code or payload.easybooks_code or sku,
        )
        self.products[product_id] = prod
        return prod
