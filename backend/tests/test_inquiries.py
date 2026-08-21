from __future__ import annotations

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.exc import IntegrityError

from unigreen.api.errors import ApiError
from unigreen.catalogue.models import (
    Product,
    ProductCategory,
    ProductCategoryLink,
    ProductCategoryTranslation,
    ProductSpecification,
    ProductSpecificationTranslation,
    ProductTranslation,
)
from unigreen.domain.enums import InquiryStatus, Locale, PublicationStatus
from unigreen.inquiries.domain import (
    build_product_snapshot,
    format_inquiry_reference,
    parse_inquiry_reference,
)
from unigreen.inquiries.models import Inquiry, InquiryLine
from unigreen.inquiries.public_router import get_public_inquiry_service
from unigreen.inquiries.repository import InquiryRepository
from unigreen.inquiries.schemas import (
    PublicInquiryCreate,
    PublicInquiryLineCreate,
)
from unigreen.inquiries.service import PublicInquiryService
from unigreen.main import app
from unigreen.media.models import ProductMedia


def make_test_category(
    slug: str = "tissue",
    name_vi: str = "Khăn giấy",
    name_en: str = "Tissue",
) -> ProductCategory:
    cat = ProductCategory(
        id=uuid4(),
        slug=slug,
        status=PublicationStatus.PUBLISHED,
        sort_order=0,
        version=1,
        translations=[
            ProductCategoryTranslation(
                locale=Locale.VI,
                name=name_vi,
                description=None,
                meta_title=None,
                meta_description=None,
            ),
            ProductCategoryTranslation(
                locale=Locale.EN,
                name=name_en,
                description=None,
                meta_title=None,
                meta_description=None,
            ),
        ],
        product_links=[],
    )
    return cat


def make_test_product(
    *,
    sku: str = "UG-001",
    slug: str = "bathroom-tissue",
    status: PublicationStatus = PublicationStatus.PUBLISHED,
    category: ProductCategory | None = None,
) -> Product:
    cat = category or make_test_category()
    item = Product(
        id=uuid4(),
        sku=sku,
        slug=slug,
        barcode="893000000001",
        status=status,
        oem_available=True,
        featured=True,
        sort_order=0,
        version=1,
        translations=[
            ProductTranslation(
                locale=Locale.VI,
                name="Giấy vệ sinh cuộn",
                summary="Giấy vệ sinh cao cấp",
                description="Chi tiết sản phẩm",
                meta_title=None,
                meta_description=None,
            ),
            ProductTranslation(
                locale=Locale.EN,
                name="Bathroom Tissue Roll",
                summary="Premium bathroom tissue",
                description="Product details",
                meta_title=None,
                meta_description=None,
            ),
        ],
        category_links=[],
        specifications=[
            ProductSpecification(
                id=uuid4(),
                key="basis_weight",
                value="15",
                unit="g/m²",
                sort_order=0,
                is_highlighted=True,
                translations=[
                    ProductSpecificationTranslation(
                        locale=Locale.VI,
                        label="Định lượng",
                        display_value_override="15 ± 1",
                    ),
                    ProductSpecificationTranslation(
                        locale=Locale.EN,
                        label="Basis weight",
                        display_value_override=None,
                    ),
                ],
            )
        ],
        media=[
            ProductMedia(
                id=uuid4(),
                product_id=uuid4(),
                storage_key="media/prod_primary.png",
                checksum_sha256="a" * 64,
                original_filename="primary.png",
                detected_mime_type="image/png",
                size_bytes=1024,
                width=800,
                height=600,
                alt_vi="Ảnh sản phẩm",
                alt_en="Product image",
                sort_order=0,
                is_primary=True,
                variants={
                    "w800": {
                        "storage_key": "media/prod_w800.webp",
                        "width": 800,
                        "height": 600,
                        "size_bytes": 512,
                    }
                },
                source_reference=None,
                approval_status="approved",
            )
        ],
    )
    item.category_links = [
        ProductCategoryLink(
            category_id=cat.id,
            product_id=item.id,
            sort_order=0,
            category=cat,
            product=item,
        )
    ]
    return item


class FakeInquiryRepository:
    def __init__(self, products: list[Product] | None = None) -> None:
        self.products: dict[UUID, Product] = {p.id: p for p in (products or [])}
        self.inquiries: dict[UUID, Inquiry] = {}
        self.inquiries_by_key: dict[str, Inquiry] = {}
        self.inquiries_by_ref: dict[str, Inquiry] = {}
        self.idempotency_lookup_results: list[Inquiry | None] = []
        self.seq = 0
        self.commits = 0
        self.rollbacks = 0
        self.commit_error: Exception | None = None

    async def get_by_id(self, inquiry_id: UUID) -> Inquiry | None:
        return self.inquiries.get(inquiry_id)

    async def get_by_reference(self, reference: str) -> Inquiry | None:
        return self.inquiries_by_ref.get(reference)

    async def get_by_idempotency_key(self, key: str) -> Inquiry | None:
        if self.idempotency_lookup_results:
            return self.idempotency_lookup_results.pop(0)
        return self.inquiries_by_key.get(key)

    async def get_products_by_ids(self, product_ids: list[UUID]) -> list[Product]:
        return [self.products[pid] for pid in product_ids if pid in self.products]

    async def next_reference(self, year: int | None = None) -> str:
        self.seq += 1
        return format_inquiry_reference(year or 2026, self.seq)

    def add(self, entity: object) -> None:
        if isinstance(entity, Inquiry):
            if entity.id is None:
                entity.id = uuid4()
            self.inquiries[entity.id] = entity
            self.inquiries_by_ref[entity.reference] = entity
            if entity.idempotency_key:
                self.inquiries_by_key[entity.idempotency_key] = entity

    async def commit(self) -> None:
        if self.commit_error:
            raise self.commit_error
        self.commits += 1

    async def rollback(self) -> None:
        self.rollbacks += 1

    async def refresh(self, entity: object) -> None:
        pass


def test_reference_format_and_parsing() -> None:
    ref = format_inquiry_reference(2026, 42)
    assert ref == "UG-INQ-2026-000042"

    year, seq = parse_inquiry_reference("UG-INQ-2026-000042")
    assert year == 2026
    assert seq == 42

    with pytest.raises(ValueError, match="Invalid inquiry reference"):
        parse_inquiry_reference("INVALID-REF")

    with pytest.raises(ValueError, match="Invalid inquiry reference"):
        parse_inquiry_reference("UG-INQ-26-42")


def test_product_snapshot_builder() -> None:
    prod = make_test_product()
    snapshot = build_product_snapshot(prod, "https://cdn.example.com/media")

    assert snapshot["product_id"] == str(prod.id)
    assert snapshot["sku"] == "UG-001"
    assert snapshot["slug"] == "bathroom-tissue"
    assert snapshot["oem_available"] is True
    translations = snapshot["translations"]
    assert isinstance(translations, dict)
    assert translations["vi"]["name"] == "Giấy vệ sinh cuộn"
    assert translations["en"]["name"] == "Bathroom Tissue Roll"

    specs = snapshot["specifications"]
    assert isinstance(specs, list)
    assert len(specs) == 1
    assert specs[0]["key"] == "basis_weight"
    assert specs[0]["translations"]["vi"]["display_value_override"] == "15 ± 1"

    primary_media = snapshot["primary_media"]
    assert isinstance(primary_media, dict)
    assert primary_media["alt_vi"] == "Ảnh sản phẩm"
    variants = primary_media["variants"]
    assert isinstance(variants, list)
    assert "https://cdn.example.com/media" in variants[0]["url"]


@pytest.mark.asyncio
async def test_create_inquiry_success() -> None:
    prod1 = make_test_product(sku="UG-001", slug="tissue-roll")
    prod2 = make_test_product(sku="UG-002", slug="jumbo-roll")
    repo = FakeInquiryRepository(products=[prod1, prod2])
    service = PublicInquiryService(repo, "https://cdn.example.com/media")  # type: ignore[arg-type]

    payload = PublicInquiryCreate(
        contact_name="Nguyen Van A",
        email="nguyen.a@example.com",
        phone="+84901234567",
        company_name="ABC Corp",
        tax_code="0123456789",
        address="123 Le Loi, District 1, HCMC",
        destination="Cat Lai Port",
        notes="Urgent delivery needed",
        oem_requirements="Custom outer carton branding",
        locale=Locale.VI,
        lines=[
            PublicInquiryLineCreate(
                product_id=prod1.id,
                quantity=Decimal("500"),
                unit="carton",
                requirements="Standard packing",
            ),
            PublicInquiryLineCreate(
                product_id=prod2.id,
                quantity=Decimal("100.50"),
                unit="pallet",
                requirements=None,
            ),
        ],
    )

    response = await service.create_inquiry(payload)

    assert response.reference == "UG-INQ-2026-000001"
    assert response.status == InquiryStatus.NEW
    assert response.contact_name == "Nguyen Van A"
    assert response.email == "nguyen.a@example.com"
    assert response.phone == "+84901234567"
    assert response.company_name == "ABC Corp"
    assert response.locale == Locale.VI
    assert len(response.lines) == 2

    line1 = response.lines[0]
    assert line1.product_id == prod1.id
    assert line1.product_sku == "UG-001"
    assert line1.product_name == "Giấy vệ sinh cuộn"
    assert line1.quantity == Decimal("500")
    assert line1.unit == "carton"
    assert line1.requirements == "Standard packing"
    assert line1.sort_order == 0

    line2 = response.lines[1]
    assert line2.product_id == prod2.id
    assert line2.product_sku == "UG-002"
    assert line2.quantity == Decimal("100.50")
    assert line2.unit == "pallet"
    assert line2.sort_order == 1

    assert repo.commits == 1


@pytest.mark.asyncio
async def test_create_inquiry_english_locale_resolves_english_name() -> None:
    prod = make_test_product(sku="UG-001")
    repo = FakeInquiryRepository(products=[prod])
    service = PublicInquiryService(repo)  # type: ignore[arg-type]

    payload = PublicInquiryCreate(
        contact_name="John Doe",
        email="john@example.com",
        locale=Locale.EN,
        lines=[
            PublicInquiryLineCreate(
                product_id=prod.id,
                quantity=Decimal("200"),
                unit="box",
            )
        ],
    )

    response = await service.create_inquiry(payload)
    assert response.lines[0].product_name == "Bathroom Tissue Roll"


@pytest.mark.asyncio
async def test_idempotent_submission_returns_existing_inquiry() -> None:
    prod = make_test_product()
    repo = FakeInquiryRepository(products=[prod])
    service = PublicInquiryService(repo)  # type: ignore[arg-type]

    payload = PublicInquiryCreate(
        contact_name="Nguyen Van A",
        email="a@example.com",
        lines=[
            PublicInquiryLineCreate(
                product_id=prod.id,
                quantity=Decimal("100"),
                unit="carton",
            )
        ],
    )

    idempotency_key = "idemp-key-12345"

    resp1 = await service.create_inquiry(payload, idempotency_key=idempotency_key)
    assert resp1.reference == "UG-INQ-2026-000001"
    assert repo.commits == 1

    # Repeat with exact same key
    resp2 = await service.create_inquiry(payload, idempotency_key=idempotency_key)
    assert resp2.id == resp1.id
    assert resp2.reference == resp1.reference
    # Did not commit again
    assert repo.commits == 1

    # New key creates second inquiry
    resp3 = await service.create_inquiry(payload, idempotency_key="idemp-key-67890")
    assert resp3.id != resp1.id
    assert resp3.reference == "UG-INQ-2026-000002"
    assert repo.commits == 2


@pytest.mark.asyncio
async def test_idempotency_race_condition_handles_integrity_error() -> None:
    prod = make_test_product()
    repo = FakeInquiryRepository(products=[prod])
    service = PublicInquiryService(repo)  # type: ignore[arg-type]

    payload = PublicInquiryCreate(
        contact_name="Nguyen Van A",
        email="a@example.com",
        lines=[
            PublicInquiryLineCreate(
                product_id=prod.id,
                quantity=Decimal("100"),
                unit="carton",
            )
        ],
    )

    key = "concurrent-key-99"

    # Simulate race condition: initial lookup returns None, commit fails with IntegrityError,
    # and second lookup after rollback returns the concurrent winning inquiry
    existing_inquiry = Inquiry(
        reference="UG-INQ-2026-000001",
        status=InquiryStatus.NEW,
        contact_name="Nguyen Van A",
        email="a@example.com",
        locale=Locale.VI,
        source="public_website",
        idempotency_key=key,
        lines=[
            InquiryLine(
                product_id=prod.id,
                product_sku=prod.sku,
                product_name="Giấy vệ sinh cuộn",
                quantity=Decimal("100"),
                unit="carton",
                sort_order=0,
            )
        ],
    )
    repo.idempotency_lookup_results = [None, existing_inquiry]
    repo.commit_error = IntegrityError("statement", {}, Exception("unique constraint violation"))

    # Service should catch IntegrityError, rollback, look up existing, and return it
    response = await service.create_inquiry(payload, idempotency_key=key)
    assert response.reference == "UG-INQ-2026-000001"
    assert repo.rollbacks == 1


@pytest.mark.asyncio
async def test_product_not_found_raises_404() -> None:
    repo = FakeInquiryRepository(products=[])
    service = PublicInquiryService(repo)  # type: ignore[arg-type]

    missing_id = uuid4()
    payload = PublicInquiryCreate(
        contact_name="Nguyen Van A",
        email="a@example.com",
        lines=[
            PublicInquiryLineCreate(
                product_id=missing_id,
                quantity=Decimal("10"),
                unit="carton",
            )
        ],
    )

    with pytest.raises(ApiError) as exc_info:
        await service.create_inquiry(payload)

    assert exc_info.value.status_code == 404
    assert exc_info.value.code == "PRODUCT_NOT_FOUND"


@pytest.mark.asyncio
async def test_unpublished_or_draft_product_raises_422() -> None:
    draft_prod = make_test_product(sku="DRAFT-01", status=PublicationStatus.DRAFT)
    unpub_prod = make_test_product(sku="UNPUB-01", status=PublicationStatus.UNPUBLISHED)
    repo = FakeInquiryRepository(products=[draft_prod, unpub_prod])
    service = PublicInquiryService(repo)  # type: ignore[arg-type]

    # Test with draft product
    payload_draft = PublicInquiryCreate(
        contact_name="Nguyen Van A",
        email="a@example.com",
        lines=[
            PublicInquiryLineCreate(
                product_id=draft_prod.id,
                quantity=Decimal("10"),
                unit="carton",
            )
        ],
    )
    with pytest.raises(ApiError) as draft_exc:
        await service.create_inquiry(payload_draft)
    assert draft_exc.value.status_code == 422
    assert draft_exc.value.code == "PRODUCT_NOT_PUBLISHED"

    # Test with unpublished product
    payload_unpub = PublicInquiryCreate(
        contact_name="Nguyen Van A",
        email="a@example.com",
        lines=[
            PublicInquiryLineCreate(
                product_id=unpub_prod.id,
                quantity=Decimal("10"),
                unit="carton",
            )
        ],
    )
    with pytest.raises(ApiError) as unpub_exc:
        await service.create_inquiry(payload_unpub)
    assert unpub_exc.value.status_code == 422
    assert unpub_exc.value.code == "PRODUCT_NOT_PUBLISHED"


@pytest.mark.asyncio
async def test_invalid_line_data_raises_validation_error() -> None:
    prod = make_test_product()
    repo = FakeInquiryRepository(products=[prod])
    service = PublicInquiryService(repo)  # type: ignore[arg-type]

    # Zero quantity
    line_zero = PublicInquiryLineCreate.model_construct(
        product_id=prod.id,
        quantity=Decimal("0"),
        unit="carton",
        requirements=None,
    )
    payload_zero = PublicInquiryCreate.model_construct(
        contact_name="A",
        email="a@example.com",
        phone=None,
        company_name=None,
        tax_code=None,
        address=None,
        destination=None,
        notes=None,
        oem_requirements=None,
        locale=Locale.VI,
        lines=[line_zero],
    )
    with pytest.raises(ApiError) as zero_exc:
        await service.create_inquiry(payload_zero)
    assert zero_exc.value.status_code == 422
    assert zero_exc.value.code == "INVALID_QUANTITY"

    # Blank unit
    line_blank_unit = PublicInquiryLineCreate.model_construct(
        product_id=prod.id,
        quantity=Decimal("10"),
        unit="",
        requirements=None,
    )
    payload_blank_unit = PublicInquiryCreate.model_construct(
        contact_name="A",
        email="a@example.com",
        phone=None,
        company_name=None,
        tax_code=None,
        address=None,
        destination=None,
        notes=None,
        oem_requirements=None,
        locale=Locale.VI,
        lines=[line_blank_unit],
    )
    with pytest.raises(ApiError) as unit_exc:
        await service.create_inquiry(payload_blank_unit)
    assert unit_exc.value.status_code == 422
    assert unit_exc.value.code == "INVALID_UNIT"


@pytest.mark.asyncio
async def test_empty_lines_raises_422() -> None:
    repo = FakeInquiryRepository()
    service = PublicInquiryService(repo)  # type: ignore[arg-type]

    payload_empty = PublicInquiryCreate.model_construct(
        contact_name="A",
        email="a@example.com",
        phone=None,
        company_name=None,
        tax_code=None,
        address=None,
        destination=None,
        notes=None,
        oem_requirements=None,
        locale=Locale.VI,
        lines=[],
    )
    with pytest.raises(ApiError) as empty_exc:
        await service.create_inquiry(payload_empty)
    assert empty_exc.value.status_code == 422
    assert empty_exc.value.code == "INVALID_INQUIRY_LINES"


@pytest.mark.asyncio
async def test_public_inquiry_endpoint_via_client(client: AsyncClient) -> None:
    prod = make_test_product()
    repo = FakeInquiryRepository(products=[prod])
    service = PublicInquiryService(repo, "https://cdn.example.com/media")  # type: ignore[arg-type]

    app.dependency_overrides[get_public_inquiry_service] = lambda: service

    try:
        # Successful creation with 201
        response = await client.post(
            "/api/v1/public/inquiries",
            headers={"Idempotency-Key": "client-test-key-1"},
            json={
                "contact_name": "Tran Thi B",
                "email": "b@example.com",
                "phone": "+84988888888",
                "company_name": "Test Company",
                "tax_code": "1234567890",
                "address": "456 Tran Hung Dao, HCMC",
                "destination": "Hai Phong",
                "notes": "Please send samples",
                "oem_requirements": "No OEM",
                "locale": "vi",
                "lines": [
                    {
                        "product_id": str(prod.id),
                        "quantity": "250.00",
                        "unit": "carton",
                        "requirements": "Special packaging",
                    }
                ],
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["reference"] == "UG-INQ-2026-000001"
        assert data["contact_name"] == "Tran Thi B"
        assert data["status"] == "new"
        assert len(data["lines"]) == 1
        assert data["lines"][0]["product_sku"] == "UG-001"
        assert Decimal(str(data["lines"][0]["quantity"])) == Decimal("250.00")

        # Idempotent retry returns same inquiry with 201
        retry_response = await client.post(
            "/api/v1/public/inquiries",
            headers={"Idempotency-Key": "client-test-key-1"},
            json={
                "contact_name": "Tran Thi B",
                "email": "b@example.com",
                "lines": [
                    {
                        "product_id": str(prod.id),
                        "quantity": "250.00",
                        "unit": "carton",
                    }
                ],
            },
        )
        assert retry_response.status_code == 201
        assert retry_response.json()["id"] == data["id"]
        assert retry_response.json()["reference"] == data["reference"]

        # Negative test: non-existent product returns 404
        missing_response = await client.post(
            "/api/v1/public/inquiries",
            json={
                "contact_name": "Tran Thi B",
                "email": "b@example.com",
                "lines": [
                    {
                        "product_id": str(uuid4()),
                        "quantity": "100.00",
                        "unit": "carton",
                    }
                ],
            },
        )
        assert missing_response.status_code == 404
        assert missing_response.json()["error"]["code"] == "PRODUCT_NOT_FOUND"

        # Negative test: invalid payload (empty lines) returns 422
        invalid_response = await client.post(
            "/api/v1/public/inquiries",
            json={
                "contact_name": "Tran Thi B",
                "email": "b@example.com",
                "lines": [],
            },
        )
        assert invalid_response.status_code == 422
        assert invalid_response.json()["error"]["code"] == "VALIDATION_ERROR"

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_inquiry_repository_database_operations() -> None:
    session = MagicMock()
    prod = make_test_product()
    inquiry = Inquiry(
        id=uuid4(),
        reference="UG-INQ-2026-000001",
        status=InquiryStatus.NEW,
        contact_name="Test",
        email="test@example.com",
        idempotency_key="key-1",
    )
    product_scalars = MagicMock()
    product_scalars.unique.return_value = [prod]
    session.scalars = AsyncMock(return_value=product_scalars)
    session.scalar = AsyncMock(side_effect=[inquiry, inquiry, inquiry, None, None])
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()

    repo = InquiryRepository(session)

    assert await repo.get_by_id(inquiry.id) is inquiry
    assert await repo.get_by_reference("UG-INQ-2026-000001") is inquiry
    assert await repo.get_by_idempotency_key("key-1") is inquiry
    assert await repo.get_by_idempotency_key("") is None
    assert await repo.get_products_by_ids([]) == []
    assert await repo.get_products_by_ids([prod.id]) == [prod]

    ref = await repo.next_reference(2026)
    assert ref == "UG-INQ-2026-000001"

    repo.add(inquiry)
    session.add.assert_called_with(inquiry)

    await repo.commit()
    session.commit.assert_awaited_once()

    await repo.rollback()
    session.rollback.assert_awaited_once()

    await repo.refresh(inquiry)
    session.refresh.assert_awaited_once_with(inquiry)
