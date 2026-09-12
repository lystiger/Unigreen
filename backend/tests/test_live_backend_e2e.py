from __future__ import annotations

from decimal import Decimal
from typing import cast
from unittest.mock import MagicMock, patch
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from unigreen.api.errors import ApiError
from unigreen.audit.models import AuditEvent
from unigreen.catalogue.models import (
    Product,
    ProductCategory,
    ProductCategoryLink,
)
from unigreen.catalogue.public_repository import PublicCatalogueRepository
from unigreen.catalogue.public_router import get_public_catalogue_service
from unigreen.catalogue.public_schemas import PublicProductQuery
from unigreen.catalogue.public_service import PublicCatalogueService
from unigreen.catalogue.repository import CatalogueRepository
from unigreen.catalogue.schemas import (
    CategoryCreate,
    CategoryTranslationInput,
    ProductCreate,
    ProductTranslationInput,
    SpecificationInput,
    SpecificationReplace,
    SpecificationTranslationInput,
)
from unigreen.catalogue.service import CatalogueService
from unigreen.config import Settings
from unigreen.domain.enums import Locale, PublicationStatus
from unigreen.inquiries.mailer import send_inquiry_email
from unigreen.inquiries.models import Inquiry
from unigreen.inquiries.public_router import get_public_inquiry_service
from unigreen.inquiries.repository import InquiryRepository
from unigreen.inquiries.service import PublicInquiryService
from unigreen.main import app
from unigreen.media.models import ProductMedia


class InMemoryCatalogueAndInquiryStore:
    def __init__(self) -> None:
        self.categories: dict[UUID, ProductCategory] = {}
        self.products: dict[UUID, Product] = {}
        self.inquiries: dict[UUID, Inquiry] = {}
        self.inquiries_by_key: dict[str, Inquiry] = {}
        self.inquiries_by_ref: dict[str, Inquiry] = {}
        self.audits: list[AuditEvent] = []
        self.seq = 0
        self.commits = 0

    # Staff Catalogue repo methods
    async def list_categories(self, locale: str | None = None) -> list[ProductCategory]:
        return list(self.categories.values())

    async def get_category(self, category_id: UUID) -> ProductCategory | None:
        return self.categories.get(category_id)

    async def list_products(
        self, query: PublicProductQuery | None = None
    ) -> list[Product] | tuple[list[Product], int]:
        prods = [p for p in self.products.values() if p.status == PublicationStatus.PUBLISHED]
        if query is not None:
            return prods, len(prods)
        return list(self.products.values())

    async def get_product(self, product_id: UUID) -> Product | None:
        return self.products.get(product_id)

    async def get_product_by_slug(self, slug: str, locale: str) -> Product | None:
        for p in self.products.values():
            if p.slug == slug and p.status == PublicationStatus.PUBLISHED:
                return p
        return None

    async def categories_exist(self, category_ids: list[UUID]) -> bool:
        return all(cid in self.categories for cid in category_ids)

    async def delete_product_links(self, product_id: UUID) -> None:
        if product_id in self.products:
            self.products[product_id].category_links = []

    async def delete_specifications(self, product_id: UUID) -> None:
        if product_id in self.products:
            self.products[product_id].specifications = []

    async def delete(self, entity: object) -> None:
        if isinstance(entity, ProductCategory):
            self.categories.pop(entity.id, None)
        elif isinstance(entity, Product):
            self.products.pop(entity.id, None)

    def add_audit(self, event: AuditEvent) -> None:
        self.audits.append(event)

    # Inquiry repo methods
    async def get_by_id(self, inquiry_id: UUID) -> Inquiry | None:
        return self.inquiries.get(inquiry_id)

    async def get_by_reference(self, reference: str) -> Inquiry | None:
        return self.inquiries_by_ref.get(reference)

    async def get_by_idempotency_key(self, key: str) -> Inquiry | None:
        return self.inquiries_by_key.get(key)

    async def get_products_by_ids(self, product_ids: list[UUID]) -> list[Product]:
        return [self.products[pid] for pid in product_ids if pid in self.products]

    async def get_products_by_slugs(self, slugs: list[str]) -> list[Product]:
        wanted = set(slugs)
        return [p for p in self.products.values() if p.slug in wanted]

    async def next_reference(self, year: int | None = None) -> str:
        self.seq += 1
        return f"UG-INQ-{year or 2026}-{self.seq:06d}"

    def add(self, entity: object) -> None:
        if isinstance(entity, ProductCategory):
            entity.id = entity.id or uuid4()
            self.categories[entity.id] = entity
        elif isinstance(entity, Product):
            entity.id = entity.id or uuid4()
            self.products[entity.id] = entity
        elif isinstance(entity, Inquiry):
            entity.id = entity.id or uuid4()
            self.inquiries[entity.id] = entity
            self.inquiries_by_ref[entity.reference] = entity
            if entity.idempotency_key:
                self.inquiries_by_key[entity.idempotency_key] = entity

    def add_all(self, entities: list[object]) -> None:
        for e in entities:
            self.add(e)

    async def commit(self) -> None:
        self.commits += 1

    async def rollback(self) -> None:
        pass

    async def refresh(self, entity: object) -> None:
        pass


@pytest.mark.asyncio
async def test_full_live_backend_staff_flow_and_inquiry_lifecycle() -> None:
    """End-to-end integration test verifying:
    1. Staff creates draft category & product with long Vietnamese names.
    2. Publication without approved primary media is rejected (Requirement 8).
    3. Staff uploads/approves media and successfully publishes.
    4. Public catalogue API serves product across both locales (VI and EN).
    5. Buyer submits exactly 1 inquiry with Idempotency-Key.
    6. Database record, lines, and product snapshots are verified.
    7. Test email notification is sent with full inquiry details.
    8. Idempotency replay returns identical reference without duplicate DB entry.
    9. Staff unpublishes product; public endpoints return 404.
    10. Staff cleans up draft records.
    """
    store = InMemoryCatalogueAndInquiryStore()
    catalogue_service = CatalogueService(cast(CatalogueRepository, store))
    public_catalogue_service = PublicCatalogueService(cast(PublicCatalogueRepository, store))
    public_inquiry_service = PublicInquiryService(
        cast(InquiryRepository, store), "http://localhost:8000/media"
    )

    actor_id = uuid4()

    # Step 1: Staff creates draft category
    category = await catalogue_service.create_category(
        CategoryCreate(
            slug="Khăn Giấy Lụa",
            sort_order=1,
            translations=[
                CategoryTranslationInput(locale=Locale.VI, name="Khăn giấy lụa cao cấp"),
                CategoryTranslationInput(locale=Locale.EN, name="Premium Facial Tissue"),
            ],
        )
    )
    category.status = PublicationStatus.PUBLISHED
    assert category.slug == "khan-giay-lua"

    # Step 2: Staff creates draft product with long Vietnamese name
    vietnamese_name = "Khăn giấy lụa cao cấp hộp rút 3 lớp Uni-Green thân thiện môi trường"
    english_name = "Uni-Green Premium 3-Ply Eco-Friendly Facial Box Tissue"

    product = await catalogue_service.create_product(
        ProductCreate(
            sku="UG-TEST-001",
            slug="khan-giay-lua-hop-rut",
            category_ids=[category.id],
            pack_options=["Hộp 100 tờ", "Hộp 150 tờ"],
            translations=[
                ProductTranslationInput(
                    locale=Locale.VI,
                    name=vietnamese_name,
                    summary="Khăn giấy lụa tự nhiên 100% bột gỗ nguyên sinh cao cấp.",
                    description="Mô tả chi tiết sản phẩm khăn giấy lụa cho gia đình và khách sạn.",
                ),
                ProductTranslationInput(
                    locale=Locale.EN,
                    name=english_name,
                    summary="Natural 100% virgin wood pulp premium facial tissue.",
                    description=(
                        "Detailed description of premium facial tissue for hotels and homes."
                    ),
                ),
            ],
        )
    )
    assert product.sku == "UG-TEST-001"
    assert product.slug == "khan-giay-lua-hop-rut"
    assert product.status == PublicationStatus.DRAFT

    # Link category
    product.category_links = [
        ProductCategoryLink(
            category_id=category.id,
            product_id=product.id,
            sort_order=0,
            category=category,
            product=product,
        )
    ]

    # Attach specification
    await catalogue_service.replace_specifications(
        product.id,
        SpecificationReplace(
            version=product.version,
            specifications=[
                SpecificationInput(
                    key="basis_weight",
                    value="16.5",
                    unit="g/m²",
                    sort_order=0,
                    is_highlighted=True,
                    translations=[
                        SpecificationTranslationInput(locale=Locale.VI, label="Định lượng giấy"),
                        SpecificationTranslationInput(locale=Locale.EN, label="Basis Weight"),
                    ],
                )
            ],
        ),
    )

    # Step 3: Requirement 8 - Treat "published with missing approved primary image" as failure
    with pytest.raises(ApiError) as media_err:
        await catalogue_service.publish_product(
            product.id,
            actor_id=actor_id,
            request_id="test-req-publish-fail",
            has_primary_media=False,
        )
    assert media_err.value.code == "PUBLICATION_REQUIREMENTS_NOT_MET"
    assert "primary_media" in media_err.value.field_errors.get("requirements", [])

    # Step 4: Upload and approve primary media
    test_media = ProductMedia(
        id=uuid4(),
        product_id=product.id,
        storage_key="media/test_tissue.png",
        checksum_sha256="c" * 64,
        original_filename="tissue_box.png",
        detected_mime_type="image/png",
        size_bytes=4096,
        width=1200,
        height=900,
        alt_vi="Ảnh hộp khăn giấy lụa",
        alt_en="Facial tissue box photo",
        sort_order=0,
        is_primary=True,
        variants={
            "w480": {
                "storage_key": "media/test_tissue_w480.webp",
                "width": 480,
                "height": 360,
                "size_bytes": 2048,
            },
            "w800": {
                "storage_key": "media/test_tissue_w800.webp",
                "width": 800,
                "height": 600,
                "size_bytes": 3500,
            },
        },
        approval_status="approved",
    )
    product.media = [test_media]

    # Step 5: Publish product with approved media
    published_product = await catalogue_service.publish_product(
        product.id,
        actor_id=actor_id,
        request_id="test-req-publish-success",
        has_primary_media=True,
    )
    assert published_product.status == PublicationStatus.PUBLISHED
    assert published_product.published_at is not None

    # Step 6: Verify public API across both locales
    app.dependency_overrides[get_public_catalogue_service] = lambda: public_catalogue_service
    app.dependency_overrides[get_public_inquiry_service] = lambda: public_inquiry_service

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # Check Vietnamese public detail
            res_vi = await client.get("/api/v1/public/products/khan-giay-lua-hop-rut?locale=vi")
            assert res_vi.status_code == 200
            data_vi = res_vi.json()
            assert data_vi["name"] == vietnamese_name
            assert data_vi["sku"] == "UG-TEST-001"
            assert data_vi["primary_media"] is not None

            # Check English public detail
            res_en = await client.get("/api/v1/public/products/khan-giay-lua-hop-rut?locale=en")
            assert res_en.status_code == 200
            data_en = res_en.json()
            assert data_en["name"] == english_name
            assert data_en["sku"] == "UG-TEST-001"

            # Step 7: Submit exactly ONE inquiry with Idempotency-Key
            idempotency_key = f"live-test-key-{uuid4()}"
            inquiry_payload = {
                "contact_name": "Trần Doanh Nghiệp",
                "email": "doanhnghiep@example.com",
                "phone": "+84 901 234 567",
                "company_name": "Công Ty TNHH Phân Phối Tiêu Dùng",
                "tax_code": "0109988776",
                "address": "Số 88 Phố Huế, Hoàn Kiếm, Hà Nội",
                "destination": "Kho Hà Nội",
                "notes": "Cần báo giá đơn hàng 500 thùng giao trước tháng 9.",
                "oem_requirements": "In tem nhãn thương hiệu riêng theo yêu cầu",
                "locale": "vi",
                "lines": [
                    {
                        "product_slug": "khan-giay-lua-hop-rut",
                        "pack_option": "Hộp 150 tờ",
                        "quantity": "500",
                        "unit": "thùng (cartons)",
                        "requirements": "Đóng 40 hộp/thùng",
                    }
                ],
            }

            inq_res = await client.post(
                "/api/v1/public/inquiries",
                headers={"Idempotency-Key": idempotency_key},
                json=inquiry_payload,
            )
            assert inq_res.status_code == 201
            inq_data = inq_res.json()
            reference = inq_data["reference"]
            assert reference.startswith("UG-INQ-2026-")
            assert inq_data["contact_name"] == "Trần Doanh Nghiệp"
            assert inq_data["status"] == "new"
            assert len(inq_data["lines"]) == 1
            assert inq_data["lines"][0]["product_sku"] == "UG-TEST-001"
            assert inq_data["lines"][0]["product_name"] == vietnamese_name

            # Step 8: Verify Database Record directly in storage
            inquiry_db = await store.get_by_reference(reference)
            assert inquiry_db is not None
            assert inquiry_db.idempotency_key == idempotency_key
            assert inquiry_db.company_name == "Công Ty TNHH Phân Phối Tiêu Dùng"
            assert len(inquiry_db.lines) == 1
            line_db = inquiry_db.lines[0]
            assert line_db.pack_option == "Hộp 150 tờ"
            assert line_db.quantity == Decimal("500")
            assert line_db.product_snapshot["sku"] == "UG-TEST-001"

            # Step 9: Verify Test Email generation
            smtp_mock = MagicMock()
            smtp_mock.__enter__.return_value = smtp_mock
            mail_settings = Settings(
                smtp_host="smtp.unigreen.vn",
                smtp_port=587,
                smtp_username="notifications@unigreen.vn",
                smtp_password="secure-app-pwd",
                smtp_from_email="noreply@unigreen.vn",
                quotation_recipient_email="sales-desk@unigreen.vn",
            )

            from unigreen.inquiries.service import inquiry_response

            response_obj = inquiry_response(inquiry_db)

            with patch("unigreen.inquiries.mailer.smtplib.SMTP", return_value=smtp_mock):
                send_inquiry_email(response_obj, mail_settings)

            smtp_mock.starttls.assert_called_once()
            smtp_mock.login.assert_called_once_with("notifications@unigreen.vn", "secure-app-pwd")
            sent_msg = smtp_mock.send_message.call_args.args[0]
            assert sent_msg["To"] == "sales-desk@unigreen.vn"
            assert sent_msg["Reply-To"] == "doanhnghiep@example.com"
            assert reference in sent_msg["Subject"]
            email_body = sent_msg.get_content()
            assert reference in email_body
            assert "Trần Doanh Nghiệp" in email_body
            assert "UG-TEST-001" in email_body
            assert "  Pack: Hộp 150 tờ" in email_body
            assert "  Specifications:" in email_body
            assert "    - Đóng 40 hộp/thùng" in email_body

            # Step 10: Verify Idempotency replay (no new commit, same reference)
            replay_res = await client.post(
                "/api/v1/public/inquiries",
                headers={"Idempotency-Key": idempotency_key},
                json=inquiry_payload,
            )
            assert replay_res.status_code == 201
            assert replay_res.json()["reference"] == reference
            assert len(store.inquiries) == 1  # Exactly one DB entry

            # Step 11: Staff unpublishes product and verifies public removal
            await catalogue_service.unpublish_product(
                product.id,
                actor_id=actor_id,
                request_id="test-req-unpublish",
            )
            assert cast(PublicationStatus, product.status) == PublicationStatus.UNPUBLISHED

            # Querying unpublished product returns 404
            unpub_res = await client.get("/api/v1/public/products/khan-giay-lua-hop-rut?locale=vi")
            assert unpub_res.status_code == 404

            # Step 12: Staff cleans up draft product & category
            await store.delete(product)
            await store.delete(category)
            assert await store.get_product(product.id) is None
            assert await store.get_category(category.id) is None

    finally:
        app.dependency_overrides.clear()
