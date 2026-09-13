"""The UniOps canonical product master, as the catalogue reads it.

UniOps owns product identity: the canonical id, the SKU, the official name and
the EasyBooks mapping. Unigreen stores only the canonical id of the product a
catalogue entry presents, plus a read-only copy of its SKU. Authority flows one
way, UniOps to Unigreen; nothing here edits a canonical product, and nothing
synchronises in the background.

Every failure to reach or understand UniOps becomes an explicit `ApiError`, so
staff see why a mapping could not be made instead of a generic server error.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Protocol
from uuid import UUID

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from unigreen.api.errors import ApiError

PRODUCTS_PATH = "/api/products"
CATALOG_KEY_HEADER = "X-UniOps-Catalog-Key"


class CanonicalProduct(BaseModel):
    """A UniOps product as `GET /api/products` returns it."""

    model_config = ConfigDict(extra="ignore")

    id: UUID
    sku: str
    name: str
    unit: str
    category: str
    status: Literal["active", "discontinued"]
    specifications: dict[str, Any] = Field(default_factory=dict)
    # EasyBooks material goods code and id. References into the accounting
    # system, shown to staff to identify the product; never stored here.
    code: str | None = None
    easybooks_material_goods_id: str | None = None
    created_at: datetime
    updated_at: datetime


class CanonicalProductDraft(BaseModel):
    """A request to UniOps for a new canonical product. UniOps assigns the SKU."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    unit: str = Field(min_length=1, max_length=50)
    category: str = Field(default="general", min_length=1, max_length=100)
    code: str | None = Field(default=None, max_length=100)
    specifications: dict[str, Any] = Field(default_factory=dict)


class CanonicalProductSource(Protocol):
    async def list_products(
        self, *, search: str | None = None, status: str | None = None
    ) -> list[CanonicalProduct]: ...

    async def get_product(self, product_id: UUID) -> CanonicalProduct | None: ...

    async def create_product(self, draft: CanonicalProductDraft) -> CanonicalProduct: ...


def _unavailable() -> ApiError:
    return ApiError(
        status_code=502,
        code="UNIOPS_UNAVAILABLE",
        message="The UniOps product master could not be reached. Try again shortly.",
    )


class UniOpsClient:
    def __init__(
        self,
        base_url: str,
        catalog_key: str,
        *,
        timeout: float = 10.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.catalog_key = catalog_key
        self.timeout = timeout
        self.transport = transport

    async def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        try:
            async with httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
                transport=self.transport,
                headers={"Accept": "application/json", CATALOG_KEY_HEADER: self.catalog_key},
            ) as client:
                response = await client.request(method, path, **kwargs)
        except httpx.HTTPError as exc:
            raise _unavailable() from exc
        if response.status_code in (401, 403):
            raise ApiError(
                status_code=502,
                code="UNIOPS_CREDENTIALS_REJECTED",
                message="UniOps refused the catalogue service key. Check the configuration.",
            )
        if response.status_code >= 500:
            raise _unavailable()
        return response

    @staticmethod
    def _parse_one(payload: Any) -> CanonicalProduct:
        try:
            return CanonicalProduct.model_validate(payload)
        except ValidationError as exc:
            raise _contract_mismatch() from exc

    async def list_products(
        self, *, search: str | None = None, status: str | None = None
    ) -> list[CanonicalProduct]:
        params = {key: value for key, value in (("search", search), ("status", status)) if value}
        response = await self._request("GET", PRODUCTS_PATH, params=params)
        _raise_unexpected(response)
        payload = response.json()
        if not isinstance(payload, list):
            raise _contract_mismatch()
        return [self._parse_one(item) for item in payload]

    async def get_product(self, product_id: UUID) -> CanonicalProduct | None:
        response = await self._request("GET", f"{PRODUCTS_PATH}/{product_id}")
        if response.status_code == 404:
            return None
        _raise_unexpected(response)
        return self._parse_one(response.json())

    async def create_product(self, draft: CanonicalProductDraft) -> CanonicalProduct:
        response = await self._request("POST", PRODUCTS_PATH, json=draft.model_dump())
        if response.status_code == 409:
            raise ApiError(
                status_code=409,
                code="CANONICAL_PRODUCT_CONFLICT",
                message="UniOps already has a product with this EasyBooks code.",
            )
        if response.status_code == 422:
            raise ApiError(
                status_code=422,
                code="CANONICAL_PRODUCT_INVALID",
                message="UniOps did not accept the product details.",
            )
        _raise_unexpected(response)
        return self._parse_one(response.json())


def _contract_mismatch() -> ApiError:
    return ApiError(
        status_code=502,
        code="UNIOPS_CONTRACT_MISMATCH",
        message="UniOps returned a product in a shape the catalogue does not understand.",
    )


def _raise_unexpected(response: httpx.Response) -> None:
    if response.is_success:
        return
    raise ApiError(
        status_code=502,
        code="UNIOPS_REQUEST_FAILED",
        message=f"UniOps answered the product request with status {response.status_code}.",
    )
