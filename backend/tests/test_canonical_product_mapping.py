"""Catalogue entries reference UniOps canonical products; UniOps owns identity."""

from __future__ import annotations

import json
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any, cast
from uuid import UUID, uuid4

import httpx
import pytest
from httpx import AsyncClient
from pydantic import ValidationError
from uniops_stub import StubCanonicalProducts, canonical_product

from unigreen.api.errors import ApiError
from unigreen.audit.models import AuditEvent
from unigreen.auth.dependencies import get_auth_context, require_csrf
from unigreen.auth.models import StaffSession
from unigreen.auth.service import AuthContext
from unigreen.auth.tokens import hash_token
from unigreen.catalogue.models import Product, ProductCategory, ProductTranslation
from unigreen.catalogue.repository import CatalogueRepository
from unigreen.catalogue.router import get_canonical_products, get_catalogue_service
from unigreen.catalogue.schemas import (
    ProductCreate,
    ProductTranslationInput,
    ProductUpdate,
)
from unigreen.catalogue.service import CatalogueService
from unigreen.config import Settings
from unigreen.domain.enums import Locale, PublicationStatus, StaffRole, StaffStatus
from unigreen.integrations.uniops import (
    CATALOG_KEY_HEADER,
    CanonicalProductDraft,
    UniOpsClient,
)
from unigreen.main import app
from unigreen.staff.models import StaffUser

# Exactly what UniOps `GET /api/products/{id}` serialises (app.schemas.ProductRead),
# including a product with no EasyBooks code.
UNIOPS_PRODUCT: dict[str, Any] = {
    "id": "e164da3c-9667-421a-a9ec-95598d0f3a11",
    "sku": "UG000001",
    "name": "Cuộn giấy vệ sinh CN 700gr -2 Lớp",
    "unit": "Cuộn",
    "category": "general",
    "status": "active",
    "specifications": {},
    "code": None,
    "easybooks_material_goods_id": None,
    "created_at": "2026-09-12T19:24:30.728532Z",
    "updated_at": "2026-09-12T19:24:30.728532Z",
}
UNIOPS_PRODUCT_ID = UUID(UNIOPS_PRODUCT["id"])


# UniOps HTTP client -------------------------------------------------------------


def uniops(handler: Callable[[httpx.Request], httpx.Response]) -> UniOpsClient:
    return UniOpsClient(
        "http://uniops.internal/", "catalogue-key", transport=httpx.MockTransport(handler)
    )


async def test_client_reads_the_uniops_product_routes_with_the_catalogue_key() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if request.url.path == "/api/products":
            return httpx.Response(200, json=[UNIOPS_PRODUCT])
        if request.url.path == f"/api/products/{UNIOPS_PRODUCT_ID}":
            return httpx.Response(200, json=UNIOPS_PRODUCT)
        return httpx.Response(404, json={"detail": "Not Found"})

    client = uniops(handler)
    listed = await client.list_products(search="UG0", status="active")
    fetched = await client.get_product(UNIOPS_PRODUCT_ID)

    assert [item.sku for item in listed] == ["UG000001"]
    assert fetched is not None and fetched.code is None
    assert seen[0].url.params == httpx.QueryParams({"search": "UG0", "status": "active"})
    assert all(request.headers[CATALOG_KEY_HEADER] == "catalogue-key" for request in seen)


async def test_client_reports_a_missing_product_as_none() -> None:
    client = uniops(lambda _: httpx.Response(404, json={"code": "PRODUCT_NOT_FOUND"}))
    assert await client.get_product(uuid4()) is None


async def test_client_creates_without_a_sku() -> None:
    sent: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        sent.update(json.loads(request.content))
        return httpx.Response(201, json={**UNIOPS_PRODUCT, "name": sent["name"]})

    created = await uniops(handler).create_product(
        CanonicalProductDraft(name="Napkin 2-ply", unit="Gói", specifications={"ply": 2})
    )

    assert created.sku == "UG000001"
    assert "sku" not in sent
    with pytest.raises(ValidationError):
        CanonicalProductDraft.model_validate({"name": "X", "unit": "Gói", "sku": "UG000009"})


@pytest.mark.parametrize(
    ("respond", "status_code", "code"),
    [
        (
            lambda: httpx.Response(401, json={"code": "CATALOG_SERVICE_KEY_INVALID"}),
            502,
            "UNIOPS_CREDENTIALS_REJECTED",
        ),
        (lambda: httpx.Response(503), 502, "UNIOPS_UNAVAILABLE"),
        (
            lambda: httpx.Response(200, json=[{"id": "not-a-product"}]),
            502,
            "UNIOPS_CONTRACT_MISMATCH",
        ),
        (lambda: httpx.Response(200, json={"items": []}), 502, "UNIOPS_CONTRACT_MISMATCH"),
        (lambda: httpx.Response(400), 502, "UNIOPS_REQUEST_FAILED"),
    ],
)
async def test_client_failures_become_explicit_errors(
    respond: Callable[[], httpx.Response], status_code: int, code: str
) -> None:
    with pytest.raises(ApiError) as raised:
        await uniops(lambda _: respond()).list_products()
    assert (raised.value.status_code, raised.value.code) == (status_code, code)


async def test_an_unreachable_uniops_is_reported_not_raised_raw() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    with pytest.raises(ApiError) as raised:
        await uniops(handler).get_product(uuid4())
    assert raised.value.code == "UNIOPS_UNAVAILABLE"


@pytest.mark.parametrize(
    ("status_code", "code"),
    [(409, "CANONICAL_PRODUCT_CONFLICT"), (422, "CANONICAL_PRODUCT_INVALID")],
)
async def test_client_create_rejections_keep_their_meaning(status_code: int, code: str) -> None:
    with pytest.raises(ApiError) as raised:
        await uniops(lambda _: httpx.Response(status_code, json={})).create_product(
            CanonicalProductDraft(name="X", unit="Gói")
        )
    assert (raised.value.status_code, raised.value.code) == (status_code, code)


# Service ------------------------------------------------------------------------


class InMemoryCatalogue:
    def __init__(self) -> None:
        self.categories: dict[UUID, ProductCategory] = {}
        self.products: dict[UUID, Product] = {}
        self.audits: list[AuditEvent] = []

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
        return next(
            (p for p in self.products.values() if p.canonical_product_id == canonical_product_id),
            None,
        )

    async def categories_exist(self, category_ids: list[UUID]) -> bool:
        return all(item in self.categories for item in category_ids)

    def add(self, entity: object) -> None:
        if isinstance(entity, Product):
            entity.id = entity.id or uuid4()
            self.products[entity.id] = entity

    def add_audit(self, event: AuditEvent) -> None:
        self.audits.append(event)

    async def commit(self) -> None:
        pass


def legacy_product(repo: InMemoryCatalogue, sku: str = "LEGACY-01") -> Product:
    product_id = uuid4()
    product = Product(
        id=product_id,
        sku=sku,
        slug=f"legacy-{product_id.hex[:6]}",
        status=PublicationStatus.PUBLISHED,
        version=1,
        oem_available=False,
        featured=False,
        sort_order=0,
        pack_options=[],
        specifications=[],
        category_links=[],
        translations=[ProductTranslation(locale=Locale.VI, name="Giấy cũ", summary="Sản phẩm cũ")],
    )
    repo.products[product_id] = product
    return product


def create_payload(canonical_id: UUID, slug: str = "khan-giay") -> ProductCreate:
    return ProductCreate(
        canonical_product_id=canonical_id,
        slug=slug,
        translations=[
            ProductTranslationInput(locale=Locale.VI, name="Khăn giấy", summary="Tóm tắt")
        ],
    )


def service_for(repo: InMemoryCatalogue) -> CatalogueService:
    return CatalogueService(cast(CatalogueRepository, repo))


def test_a_catalogue_product_cannot_be_created_with_its_own_sku_or_without_a_reference() -> None:
    translations = [{"locale": "vi", "name": "X", "summary": "Y"}]
    with pytest.raises(ValidationError):
        ProductCreate.model_validate({"slug": "x", "sku": "UG-1", "translations": translations})
    with pytest.raises(ValidationError):
        ProductCreate.model_validate(
            {
                "canonical_product_id": str(uuid4()),
                "sku": "UG-1",
                "slug": "x",
                "translations": translations,
            }
        )


async def test_create_copies_the_sku_from_the_canonical_product() -> None:
    repo = InMemoryCatalogue()
    canonical = canonical_product("UG000042")

    product = await service_for(repo).create_product(
        create_payload(canonical.id), StubCanonicalProducts(canonical)
    )

    assert product.canonical_product_id == str(canonical.id)
    assert product.sku == "UG000042"


async def test_create_refuses_a_canonical_product_uniops_does_not_have() -> None:
    with pytest.raises(ApiError) as raised:
        await service_for(InMemoryCatalogue()).create_product(
            create_payload(uuid4()), StubCanonicalProducts()
        )
    assert (raised.value.status_code, raised.value.code) == (422, "CANONICAL_PRODUCT_NOT_FOUND")


async def test_one_canonical_product_is_presented_by_at_most_one_entry() -> None:
    repo = InMemoryCatalogue()
    canonical = canonical_product()
    products = StubCanonicalProducts(canonical)
    await service_for(repo).create_product(create_payload(canonical.id), products)

    with pytest.raises(ApiError) as on_create:
        await service_for(repo).create_product(create_payload(canonical.id, "again"), products)
    assert on_create.value.code == "CANONICAL_PRODUCT_ALREADY_MAPPED"

    other = legacy_product(repo)
    with pytest.raises(ApiError) as on_map:
        await service_for(repo).map_canonical_product(
            other.id, canonical.id, products, actor_id=uuid4(), request_id="r"
        )
    assert on_map.value.code == "CANONICAL_PRODUCT_ALREADY_MAPPED"
    assert other.canonical_product_id is None
    assert other.sku == "LEGACY-01"


async def test_mapping_a_legacy_entry_takes_the_uniops_sku_and_is_audited() -> None:
    repo = InMemoryCatalogue()
    legacy = legacy_product(repo)
    canonical = canonical_product("UG000007")
    actor = uuid4()

    mapped = await service_for(repo).map_canonical_product(
        legacy.id, canonical.id, StubCanonicalProducts(canonical), actor_id=actor, request_id="r1"
    )

    assert mapped.canonical_product_id == str(canonical.id)
    assert mapped.sku == "UG000007"
    assert mapped.version == 2
    assert repo.audits[-1].action == "product.mapped"
    assert repo.audits[-1].actor_staff_id == actor
    assert repo.audits[-1].change_summary == {
        "canonical_product_id": str(canonical.id),
        "sku": "UG000007",
        "previous_sku": "LEGACY-01",
    }


async def test_mapping_again_to_the_same_product_changes_nothing() -> None:
    repo = InMemoryCatalogue()
    legacy = legacy_product(repo)
    canonical = canonical_product()
    products = StubCanonicalProducts(canonical)
    service = service_for(repo)
    await service.map_canonical_product(
        legacy.id, canonical.id, products, actor_id=uuid4(), request_id="r"
    )

    again = await service.map_canonical_product(
        legacy.id, canonical.id, products, actor_id=uuid4(), request_id="r"
    )

    assert again.version == 2
    assert len(repo.audits) == 1


async def test_a_mapped_entry_is_not_silently_remapped() -> None:
    repo = InMemoryCatalogue()
    legacy = legacy_product(repo)
    first, second = canonical_product("UG000001"), canonical_product("UG000002")
    products = StubCanonicalProducts(first, second)
    service = service_for(repo)
    await service.map_canonical_product(
        legacy.id, first.id, products, actor_id=uuid4(), request_id="r"
    )

    with pytest.raises(ApiError) as raised:
        await service.map_canonical_product(
            legacy.id, second.id, products, actor_id=uuid4(), request_id="r"
        )
    assert raised.value.code == "PRODUCT_ALREADY_MAPPED"
    assert legacy.canonical_product_id == str(first.id)


async def test_mapping_to_a_missing_canonical_product_fails_clearly() -> None:
    repo = InMemoryCatalogue()
    legacy = legacy_product(repo)

    with pytest.raises(ApiError) as raised:
        await service_for(repo).map_canonical_product(
            legacy.id, uuid4(), StubCanonicalProducts(), actor_id=uuid4(), request_id="r"
        )
    assert raised.value.code == "CANONICAL_PRODUCT_NOT_FOUND"
    assert legacy.canonical_product_id is None


async def test_a_mapped_sku_can_only_change_in_uniops() -> None:
    repo = InMemoryCatalogue()
    legacy = legacy_product(repo)
    canonical = canonical_product("UG000003")
    service = service_for(repo)
    await service.map_canonical_product(
        legacy.id, canonical.id, StubCanonicalProducts(canonical), actor_id=uuid4(), request_id="r"
    )

    with pytest.raises(ApiError) as raised:
        await service.update_product(legacy.id, ProductUpdate(version=2, sku="MY-OWN-SKU"))
    assert raised.value.code == "SKU_MANAGED_BY_UNIOPS"

    # Resending the same SKU, as the editor form does, is not a change.
    updated = await service.update_product(legacy.id, ProductUpdate(version=2, sku="UG000003"))
    assert updated.sku == "UG000003"


async def test_an_update_cannot_attach_a_mapping() -> None:
    repo = InMemoryCatalogue()
    legacy = legacy_product(repo)

    payload = ProductUpdate.model_validate({"version": 1, "canonical_product_id": str(uuid4())})
    await service_for(repo).update_product(legacy.id, payload)

    assert legacy.canonical_product_id is None


async def test_an_unmapped_legacy_entry_still_edits_its_own_sku() -> None:
    repo = InMemoryCatalogue()
    legacy = legacy_product(repo)

    updated = await service_for(repo).update_product(
        legacy.id, ProductUpdate(version=1, sku="legacy 02")
    )
    assert updated.sku == "LEGACY-02"


async def test_unmapping_keeps_the_last_sku_and_is_audited() -> None:
    repo = InMemoryCatalogue()
    legacy = legacy_product(repo)
    canonical = canonical_product("UG000005")
    service = service_for(repo)
    await service.map_canonical_product(
        legacy.id, canonical.id, StubCanonicalProducts(canonical), actor_id=uuid4(), request_id="r"
    )

    unmapped = await service.unmap_canonical_product(legacy.id, actor_id=uuid4(), request_id="u")

    assert unmapped.canonical_product_id is None
    assert unmapped.sku == "UG000005"
    assert repo.audits[-1].action == "product.unmapped"
    assert repo.audits[-1].change_summary["canonical_product_id"] == str(canonical.id)
    await service.unmap_canonical_product(legacy.id, actor_id=uuid4(), request_id="u")
    assert len(repo.audits) == 2


# Staff routes -------------------------------------------------------------------


def staff_context() -> AuthContext:
    user = StaffUser(
        id=uuid4(),
        email="admin@unigreen.example",
        password_hash="fake-hash",
        role=StaffRole.ADMINISTRATOR,
        status=StaffStatus.ACTIVE,
    )
    return AuthContext(
        user=user,
        session=StaffSession(
            staff_user_id=user.id,
            token_hash=hash_token("session"),
            csrf_token_hash=hash_token("csrf"),
            expires_at=datetime.now(UTC),
        ),
    )


@pytest.fixture
def staff_app() -> Any:
    repo = InMemoryCatalogue()
    context = staff_context()
    app.dependency_overrides[get_catalogue_service] = lambda: service_for(repo)
    app.dependency_overrides[get_auth_context] = lambda: context
    app.dependency_overrides[require_csrf] = lambda: context
    yield repo
    app.dependency_overrides.clear()


async def test_staff_mapping_workflow(client: AsyncClient, staff_app: InMemoryCatalogue) -> None:
    repo = staff_app
    legacy = legacy_product(repo)
    taken = canonical_product("UG000001", "Already presented")
    free = canonical_product("UG000002", "Jumbo roll 700g", code="TP.GVS700/2")
    products = StubCanonicalProducts(taken, free)
    legacy_product(repo, "OTHER").canonical_product_id = str(taken.id)
    app.dependency_overrides[get_canonical_products] = lambda: products

    listed = (await client.get("/api/v1/staff/canonical-products")).json()
    by_sku = {item["sku"]: item for item in listed}
    assert by_sku["UG000002"]["easybooks_code"] == "TP.GVS700/2"
    assert by_sku["UG000002"]["mapped_catalogue_product_id"] is None
    assert by_sku["UG000001"]["mapped_catalogue_product_id"] is not None

    unmapped = (await client.get("/api/v1/staff/products?mapping_status=unmapped")).json()
    assert [item["sku"] for item in unmapped] == ["LEGACY-01"]

    response = await client.post(
        f"/api/v1/staff/products/{legacy.id}/map", json={"canonical_product_id": str(free.id)}
    )
    assert response.status_code == 200, response.text
    assert response.json()["is_mapped"] is True
    assert response.json()["canonical_product_id"] == str(free.id)
    assert response.json()["sku"] == "UG000002"

    mapped = (await client.get("/api/v1/staff/products?mapping_status=mapped")).json()
    assert {item["sku"] for item in mapped} == {"UG000002", "OTHER"}

    assert (
        await client.post(
            f"/api/v1/staff/products/{legacy.id}/map", json={"canonical_product_id": "cp-1"}
        )
    ).status_code == 422
    assert (await client.get("/api/v1/staff/products?mapping_status=maybe")).status_code == 422

    created = await client.post(
        "/api/v1/staff/canonical-products", json={"name": "Napkin 3-ply", "unit": "Gói"}
    )
    assert created.status_code == 201, created.text
    assert created.json()["sku"] == "UG000003"
    assert created.json()["mapped_catalogue_product_id"] is None
    assert (
        await client.post(
            "/api/v1/staff/canonical-products",
            json={"name": "Chosen", "unit": "Gói", "sku": "UG000999"},
        )
    ).status_code == 422


async def test_without_uniops_configured_mapping_fails_but_the_catalogue_reads(
    client: AsyncClient, staff_app: InMemoryCatalogue
) -> None:
    legacy = legacy_product(staff_app)

    listed = await client.get("/api/v1/staff/canonical-products")
    mapping = await client.post(
        f"/api/v1/staff/products/{legacy.id}/map", json={"canonical_product_id": str(uuid4())}
    )

    assert (listed.status_code, listed.json()["error"]["code"]) == (503, "UNIOPS_NOT_CONFIGURED")
    assert mapping.status_code == 503
    assert (await client.get("/api/v1/staff/products")).status_code == 200


def test_configured_settings_build_a_real_client() -> None:
    settings = Settings(uniops_base_url="http://uniops.internal", uniops_catalog_key="k" * 40)
    assert isinstance(get_canonical_products(settings), UniOpsClient)
