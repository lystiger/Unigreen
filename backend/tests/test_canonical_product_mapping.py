from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, cast
from uuid import UUID, uuid4

import httpx
import pytest
from httpx import AsyncClient, Response

from unigreen.api.errors import ApiError
from unigreen.audit.models import AuditEvent
from unigreen.auth.dependencies import get_auth_context, require_csrf
from unigreen.auth.models import StaffSession
from unigreen.auth.service import AuthContext
from unigreen.auth.tokens import hash_token
from unigreen.catalogue.models import (
    Product,
    ProductCategory,
    ProductTranslation,
)
from unigreen.catalogue.repository import CatalogueRepository
from unigreen.catalogue.router import get_catalogue_service, get_uniops_client
from unigreen.catalogue.schemas import (
    ProductCreate,
    ProductTranslationInput,
    ProductUpdate,
)
from unigreen.catalogue.service import CatalogueService
from unigreen.domain.enums import Locale, PublicationStatus, StaffRole, StaffStatus
from unigreen.integrations.uniops import (
    CanonicalProduct,
    CanonicalProductCreatePayload,
    FakeUniOpsClient,
    UniOpsClient,
)
from unigreen.main import app
from unigreen.staff.models import StaffUser


def make_staff(
    role: StaffRole = StaffRole.ADMINISTRATOR,
    email: str = "admin@unigreen.example",
) -> StaffUser:
    return StaffUser(
        id=uuid4(),
        email=email,
        password_hash="fake-hash",
        role=role,
        status=StaffStatus.ACTIVE,
    )


def make_auth_context(user: StaffUser) -> AuthContext:
    return AuthContext(
        user=user,
        session=StaffSession(
            staff_user_id=user.id,
            token_hash=hash_token("test-session"),
            csrf_token_hash=hash_token("test-csrf"),
            expires_at=datetime.now(UTC),
        ),
    )


class InMemCatalogueRepo:
    def __init__(self) -> None:
        self.categories: dict[UUID, ProductCategory] = {}
        self.products: dict[UUID, Product] = {}
        self.audits: list[AuditEvent] = []

    async def list_categories(self) -> list[ProductCategory]:
        return list(self.categories.values())

    async def get_category(self, category_id: UUID) -> ProductCategory | None:
        return self.categories.get(category_id)

    async def list_products(self, mapping_status: str | None = None) -> list[Product]:
        items = list(self.products.values())
        if mapping_status == "mapped":
            return [p for p in items if p.canonical_product_id is not None]
        if mapping_status == "unmapped":
            return [p for p in items if p.canonical_product_id is None]
        return items

    async def get_product(self, product_id: UUID) -> Product | None:
        return self.products.get(product_id)

    async def get_product_by_canonical_id(self, canonical_product_id: str) -> Product | None:
        for p in self.products.values():
            if p.canonical_product_id == canonical_product_id:
                return p
        return None

    async def categories_exist(self, category_ids: list[UUID]) -> bool:
        return all(cid in self.categories for cid in category_ids)

    def add(self, entity: object) -> None:
        if isinstance(entity, ProductCategory):
            self.categories[entity.id] = entity
        elif isinstance(entity, Product):
            self.products[entity.id] = entity

    def add_audit(self, event: AuditEvent) -> None:
        self.audits.append(event)

    async def commit(self) -> None:
        pass


@pytest.mark.asyncio
async def test_fake_uniops_client() -> None:
    initial = [
        CanonicalProduct(
            id="p-001",
            sku="UG000001",
            name="Roll Jumbo A",
            unit="cuộn",
            category="Túi cuộn",
            status="active",
        )
    ]
    client = FakeUniOpsClient(products=initial)

    # list
    prods = await client.list_products()
    assert len(prods) == 1
    assert prods[0].sku == "UG000001"

    # search
    search_res = await client.list_products(search="Jumbo")
    assert len(search_res) == 1
    assert len(await client.list_products(search="NonExistent")) == 0

    # filter by category
    assert len(await client.list_products(category="Túi cuộn")) == 1
    assert len(await client.list_products(category="Khác")) == 0

    # filter by status
    assert len(await client.list_products(status="active")) == 1
    assert len(await client.list_products(status="discontinued")) == 0

    # get by id
    p = await client.get_product("p-001")
    assert p is not None
    assert p.name == "Roll Jumbo A"
    assert await client.get_product("missing") is None

    # get by sku
    by_sku = await client.get_product_by_sku("UG000001")
    assert by_sku is not None
    assert by_sku.id == "p-001"
    assert await client.get_product_by_sku("UG999999") is None

    # create
    created = await client.create_product(
        CanonicalProductCreatePayload(
            name="Roll Jumbo B",
            unit="cuộn",
            category="Túi cuộn",
        )
    )
    assert created.sku == "UG000002"
    assert len(await client.list_products()) == 2


@pytest.mark.asyncio
async def test_uniops_client_http() -> None:
    def handler(request: httpx.Request) -> Response:
        if request.url.path == "/api/v1/products" and request.method == "GET":
            return Response(
                200,
                json=[
                    {
                        "id": "cp-1",
                        "sku": "UG000001",
                        "name": "Test Product",
                        "unit": "cái",
                        "category": "Cat A",
                        "status": "active",
                        "specifications": {},
                        "easybooks_code": "EB01",
                        "code": "EB01",
                    }
                ],
            )
        if request.url.path == "/api/v1/products/cp-1" and request.method == "GET":
            return Response(
                200,
                json={
                    "id": "cp-1",
                    "sku": "UG000001",
                    "name": "Test Product",
                    "unit": "cái",
                    "category": "Cat A",
                    "status": "active",
                    "specifications": {},
                    "easybooks_code": "EB01",
                    "code": "EB01",
                },
            )
        if request.url.path == "/api/v1/products/cp-missing":
            return Response(404, json={"detail": "Not found"})
        if request.url.path == "/api/v1/products" and request.method == "POST":
            return Response(
                201,
                json={
                    "id": "cp-2",
                    "sku": "UG000002",
                    "name": "Created Product",
                    "unit": "cái",
                    "category": None,
                    "status": "active",
                    "specifications": {},
                    "easybooks_code": None,
                    "code": "UG000002",
                },
            )
        return Response(404)

    transport = httpx.MockTransport(handler)
    client = UniOpsClient(base_url="http://uniops.local", api_key="secret-key")

    # Monkey patch httpx.AsyncClient to use MockTransport in tests
    import unittest.mock as mock

    original_async_client = httpx.AsyncClient

    def mock_async_client(*args: Any, **kwargs: Any) -> httpx.AsyncClient:
        kwargs["transport"] = transport
        return original_async_client(*args, **kwargs)

    with mock.patch("httpx.AsyncClient", side_effect=mock_async_client):
        prods = await client.list_products(search="Test")
        assert len(prods) == 1
        assert prods[0].sku == "UG000001"

        p1 = await client.get_product("cp-1")
        assert p1 is not None
        assert p1.name == "Test Product"

        p_none = await client.get_product("cp-missing")
        assert p_none is None

        by_sku = await client.get_product_by_sku("UG000001")
        assert by_sku is not None
        assert by_sku.id == "cp-1"

        created = await client.create_product(
            CanonicalProductCreatePayload(name="Created Product", unit="cái")
        )
        assert created.id == "cp-2"
        assert created.sku == "UG000002"


@pytest.mark.asyncio
async def test_create_product_with_canonical_id() -> None:
    repo = InMemCatalogueRepo()
    service = CatalogueService(cast(CatalogueRepository, repo))
    uniops = FakeUniOpsClient(
        products=[
            CanonicalProduct(
                id="cp-01",
                sku="UG000001",
                name="Canonical Roll",
                unit="cuộn",
            )
        ]
    )

    payload = ProductCreate(
        canonical_product_id="cp-01",
        slug="canonical-roll",
        translations=[
            ProductTranslationInput(
                locale=Locale.VI,
                name="Cuộn Chuẩn",
                summary="Tóm tắt",
            )
        ],
    )

    # 1. Successful creation resolves SKU from UniOps
    created = await service.create_product(payload, client=uniops)
    assert created.canonical_product_id == "cp-01"
    assert created.sku == "UG000001"

    # 2. Duplicate canonical product mapping rejected with 409
    with pytest.raises(ApiError) as exc_info:
        await service.create_product(
            ProductCreate(
                canonical_product_id="cp-01",
                slug="canonical-roll-2",
                translations=[
                    ProductTranslationInput(
                        locale=Locale.VI,
                        name="Cuộn 2",
                        summary="Tóm tắt",
                    )
                ],
            ),
            client=uniops,
        )
    assert exc_info.value.status_code == 409
    assert exc_info.value.code == "CANONICAL_PRODUCT_ALREADY_MAPPED"

    # 3. Non-existent canonical product rejected with 404
    with pytest.raises(ApiError) as exc_404:
        await service.create_product(
            ProductCreate(
                canonical_product_id="cp-non-existent",
                slug="non-existent",
                translations=[
                    ProductTranslationInput(
                        locale=Locale.VI,
                        name="Không tồn tại",
                        summary="Tóm tắt",
                    )
                ],
            ),
            client=uniops,
        )
    assert exc_404.value.status_code == 404
    assert exc_404.value.code == "CANONICAL_PRODUCT_NOT_FOUND"


@pytest.mark.asyncio
async def test_map_and_unmap_product() -> None:
    repo = InMemCatalogueRepo()
    service = CatalogueService(cast(CatalogueRepository, repo))
    uniops = FakeUniOpsClient(
        products=[
            CanonicalProduct(
                id="cp-01",
                sku="UG000001",
                name="Canonical 1",
                unit="cái",
            ),
            CanonicalProduct(
                id="cp-02",
                sku="UG000002",
                name="Canonical 2",
                unit="cái",
            ),
        ]
    )

    # Create unmapped product with legacy SKU
    prod_id = uuid4()
    p1 = Product(
        id=prod_id,
        sku="LEGACY-SKU-1",
        slug="legacy-prod-1",
        status=PublicationStatus.DRAFT,
        version=1,
    )
    repo.products[prod_id] = p1

    actor = uuid4()

    # 1. Map to cp-01
    mapped = await service.map_canonical_product(
        prod_id, "cp-01", uniops, actor_id=actor, request_id="req-1"
    )
    assert mapped.canonical_product_id == "cp-01"
    assert mapped.sku == "UG000001"  # shadow field synchronized!
    assert mapped.version == 2
    assert len(repo.audits) == 1
    assert repo.audits[0].action == "product.mapped"

    # 2. Cannot map another product to cp-01
    prod_id_2 = uuid4()
    p2 = Product(
        id=prod_id_2,
        sku="LEGACY-SKU-2",
        slug="legacy-prod-2",
        status=PublicationStatus.DRAFT,
        version=1,
    )
    repo.products[prod_id_2] = p2

    with pytest.raises(ApiError) as exc_conflict:
        await service.map_canonical_product(
            prod_id_2, "cp-01", uniops, actor_id=actor, request_id="req-2"
        )
    assert exc_conflict.value.status_code == 409
    assert exc_conflict.value.code == "CANONICAL_PRODUCT_ALREADY_MAPPED"

    # 3. Cannot map to missing canonical product
    with pytest.raises(ApiError) as exc_missing:
        await service.map_canonical_product(
            prod_id_2, "cp-999", uniops, actor_id=actor, request_id="req-3"
        )
    assert exc_missing.value.status_code == 404
    assert exc_missing.value.code == "CANONICAL_PRODUCT_NOT_FOUND"

    # 4. Unmap cp-01
    unmapped = await service.unmap_canonical_product(
        prod_id, actor_id=actor, request_id="req-4"
    )
    assert unmapped.canonical_product_id is None
    assert unmapped.sku == "UG000001"  # shadow SKU remains intact
    assert unmapped.version == 3
    assert len(repo.audits) == 2
    assert repo.audits[1].action == "product.unmapped"

    # 5. Calling unmap again on already unmapped product is a safe no-op
    re_unmapped = await service.unmap_canonical_product(
        prod_id, actor_id=actor, request_id="req-5"
    )
    assert re_unmapped.canonical_product_id is None
    assert re_unmapped.version == 3


@pytest.mark.asyncio
async def test_list_products_mapping_status_filter() -> None:
    repo = InMemCatalogueRepo()
    p_mapped = Product(
        id=uuid4(),
        sku="UG000001",
        canonical_product_id="cp-01",
        slug="mapped",
        status=PublicationStatus.PUBLISHED,
        version=1,
    )
    p_unmapped = Product(
        id=uuid4(),
        sku="LEGACY-01",
        canonical_product_id=None,
        slug="unmapped",
        status=PublicationStatus.DRAFT,
        version=1,
    )
    repo.products[p_mapped.id] = p_mapped
    repo.products[p_unmapped.id] = p_unmapped

    all_prods = await repo.list_products()
    assert len(all_prods) == 2

    mapped_prods = await repo.list_products(mapping_status="mapped")
    assert len(mapped_prods) == 1
    assert mapped_prods[0].id == p_mapped.id

    unmapped_prods = await repo.list_products(mapping_status="unmapped")
    assert len(unmapped_prods) == 1
    assert unmapped_prods[0].id == p_unmapped.id


@pytest.mark.asyncio
async def test_update_product_canonical_id_conflict() -> None:
    repo = InMemCatalogueRepo()
    service = CatalogueService(cast(CatalogueRepository, repo))
    p1 = Product(
        id=uuid4(),
        sku="UG000001",
        canonical_product_id="cp-01",
        slug="p1",
        status=PublicationStatus.DRAFT,
        version=1,
    )
    p2 = Product(
        id=uuid4(),
        sku="UG000002",
        canonical_product_id=None,
        slug="p2",
        status=PublicationStatus.DRAFT,
        version=1,
    )
    repo.products[p1.id] = p1
    repo.products[p2.id] = p2

    # Attempting to update p2 with p1's canonical_product_id raises 409
    with pytest.raises(ApiError) as exc_info:
        await service.update_product(
            p2.id,
            ProductUpdate(version=1, canonical_product_id="cp-01"),
        )
    assert exc_info.value.status_code == 409
    assert exc_info.value.code == "CANONICAL_PRODUCT_ALREADY_MAPPED"


@pytest.mark.asyncio
async def test_staff_canonical_product_endpoints(client: AsyncClient) -> None:
    admin = make_staff(role=StaffRole.ADMINISTRATOR)
    repo = InMemCatalogueRepo()
    service = CatalogueService(cast(CatalogueRepository, repo))
    uniops = FakeUniOpsClient(
        products=[
            CanonicalProduct(
                id="cp-100",
                sku="UG000100",
                name="Eco Bag 100",
                unit="cái",
                category="Túi sinh học",
                status="active",
            )
        ]
    )

    # Create unmapped product in repo
    prod_id = uuid4()
    p = Product(
        id=prod_id,
        sku="UNMAPPED-01",
        slug="unmapped-bag",
        status=PublicationStatus.DRAFT,
        version=1,
        oem_available=False,
        featured=False,
        sort_order=0,
        specifications=[],
        category_links=[],
        translations=[
            ProductTranslation(
                product_id=prod_id,
                locale=Locale.VI,
                name="Túi chưa map",
                summary="Tóm tắt",
            )
        ],
    )
    repo.products[prod_id] = p

    app.dependency_overrides[get_catalogue_service] = lambda: service
    app.dependency_overrides[get_uniops_client] = lambda: uniops
    app.dependency_overrides[get_auth_context] = lambda: make_auth_context(admin)
    app.dependency_overrides[require_csrf] = lambda: make_auth_context(admin)

    try:
        # 1. GET /canonical-products
        resp = await client.get("/api/v1/staff/canonical-products")
        assert resp.status_code == 200
        canonicals = resp.json()
        assert len(canonicals) == 1
        assert canonicals[0]["sku"] == "UG000100"

        # 2. POST /canonical-products
        create_cp_resp = await client.post(
            "/api/v1/staff/canonical-products",
            json={
                "name": "Eco Bag 101",
                "unit": "cái",
                "category": "Túi sinh học",
            },
        )
        assert create_cp_resp.status_code == 201
        created_cp = create_cp_resp.json()
        assert created_cp["name"] == "Eco Bag 101"
        assert created_cp["sku"] == "UG000002"

        # 3. GET /products with mapping_status filter
        resp_filter = await client.get("/api/v1/staff/products?mapping_status=unmapped")
        assert resp_filter.status_code == 200
        assert len(resp_filter.json()) == 1
        assert resp_filter.json()[0]["is_mapped"] is False

        # 4. POST /products/{id}/map
        map_resp = await client.post(
            f"/api/v1/staff/products/{prod_id}/map",
            json={"canonical_product_id": "cp-100"},
        )
        assert map_resp.status_code == 200
        mapped_data = map_resp.json()
        assert mapped_data["is_mapped"] is True
        assert mapped_data["canonical_product_id"] == "cp-100"
        assert mapped_data["sku"] == "UG000100"

        # 5. Verify mapping filter now reflects mapped
        resp_mapped = await client.get("/api/v1/staff/products?mapping_status=mapped")
        assert resp_mapped.status_code == 200
        assert len(resp_mapped.json()) == 1
        assert resp_mapped.json()[0]["id"] == str(prod_id)

        # 6. POST /products/{id}/unmap
        unmap_resp = await client.post(f"/api/v1/staff/products/{prod_id}/unmap")
        assert unmap_resp.status_code == 200
        unmapped_data = unmap_resp.json()
        assert unmapped_data["is_mapped"] is False
        assert unmapped_data["canonical_product_id"] is None
    finally:
        app.dependency_overrides.clear()
