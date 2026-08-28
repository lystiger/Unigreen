from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy.exc import IntegrityError

from unigreen.api.errors import ApiError
from unigreen.catalogue.models import Product
from unigreen.domain.enums import InquiryStatus, Locale, PublicationStatus
from unigreen.inquiries.domain import build_product_snapshot
from unigreen.inquiries.models import Inquiry, InquiryLine
from unigreen.inquiries.repository import InquiryRepository
from unigreen.inquiries.schemas import (
    PublicInquiryCreate,
    PublicInquiryLineResponse,
    PublicInquiryResponse,
)


def inquiry_response(inquiry: Inquiry) -> PublicInquiryResponse:
    return PublicInquiryResponse(
        id=inquiry.id or uuid4(),
        reference=inquiry.reference,
        status=inquiry.status,
        contact_name=inquiry.contact_name,
        email=inquiry.email,
        phone=inquiry.phone,
        company_name=inquiry.company_name,
        tax_code=inquiry.tax_code,
        address=inquiry.address,
        destination=inquiry.destination,
        notes=inquiry.notes,
        oem_requirements=inquiry.oem_requirements,
        locale=inquiry.locale,
        created_at=inquiry.created_at or datetime.now(UTC),
        lines=[
            PublicInquiryLineResponse(
                id=line.id or uuid4(),
                product_id=line.product_id,
                product_sku=line.product_sku,
                product_name=line.product_name,
                pack_option=line.pack_option,
                quantity=line.quantity,
                unit=line.unit,
                requirements=line.requirements,
                sort_order=line.sort_order,
            )
            for line in inquiry.lines
        ],
    )


class PublicInquiryService:
    def __init__(self, repository: InquiryRepository, public_media_base_url: str = "") -> None:
        self.repository = repository
        self.public_media_base_url = public_media_base_url.rstrip("/")

    async def create_inquiry(
        self,
        payload: PublicInquiryCreate,
        idempotency_key: str | None = None,
    ) -> PublicInquiryResponse:
        cleaned_key = idempotency_key.strip() if idempotency_key else None

        if cleaned_key:
            existing = await self.repository.get_by_idempotency_key(cleaned_key)
            if existing is not None:
                return inquiry_response(existing)

        if not payload.lines:
            raise ApiError(
                status_code=422,
                code="INVALID_INQUIRY_LINES",
                message="At least one inquiry line is required.",
            )

        for idx, line in enumerate(payload.lines):
            if line.quantity <= Decimal("0"):
                raise ApiError(
                    status_code=422,
                    code="INVALID_QUANTITY",
                    message="Quantity must be greater than zero.",
                    field_errors={f"lines.{idx}.quantity": ["Quantity must be greater than zero."]},
                )
            if not line.unit or not line.unit.strip():
                raise ApiError(
                    status_code=422,
                    code="INVALID_UNIT",
                    message="Unit cannot be blank.",
                    field_errors={f"lines.{idx}.unit": ["Unit cannot be blank."]},
                )

        product_ids = [line.product_id for line in payload.lines if line.product_id is not None]
        product_slugs = [line.product_slug for line in payload.lines if line.product_slug]
        products = await self.repository.get_products_by_ids(product_ids)
        if product_slugs:
            products.extend(await self.repository.get_products_by_slugs(product_slugs))
        product_map: dict[UUID, Product] = {p.id: p for p in products}
        product_by_slug: dict[str, Product] = {p.slug: p for p in products}

        # Check all products exist
        missing_lines = [
            line
            for line in payload.lines
            if (line.product_id is not None and line.product_id not in product_map)
            or (line.product_slug is not None and line.product_slug not in product_by_slug)
        ]
        if missing_lines:
            missing_label = str(missing_lines[0].product_id or missing_lines[0].product_slug)
            raise ApiError(
                status_code=404,
                code="PRODUCT_NOT_FOUND",
                message=f"Product '{missing_label}' was not found.",
                field_errors={"lines": [f"Product '{missing_label}' was not found."]},
            )

        # Check all products are published
        unpublished_skus: list[str] = []
        for p in products:
            if p.status != PublicationStatus.PUBLISHED:
                unpublished_skus.append(p.sku)

        if unpublished_skus:
            raise ApiError(
                status_code=422,
                code="PRODUCT_NOT_PUBLISHED",
                message=f"Product '{unpublished_skus[0]}' is not published and cannot be inquired.",
                field_errors={"lines": [f"Product '{unpublished_skus[0]}' is not published."]},
            )

        reference = await self.repository.next_reference()

        inquiry = Inquiry(
            reference=reference,
            status=InquiryStatus.NEW,
            contact_name=payload.contact_name.strip(),
            email=payload.email.strip().lower(),
            phone=payload.phone.strip() if payload.phone else None,
            company_name=payload.company_name.strip() if payload.company_name else None,
            tax_code=payload.tax_code.strip() if payload.tax_code else None,
            address=payload.address.strip() if payload.address else None,
            destination=payload.destination.strip() if payload.destination else None,
            notes=payload.notes.strip() if payload.notes else None,
            oem_requirements=payload.oem_requirements.strip() if payload.oem_requirements else None,
            locale=payload.locale,
            source="public_website",
            idempotency_key=cleaned_key,
        )

        for sort_order, line_payload in enumerate(payload.lines):
            product = (
                product_map[line_payload.product_id]
                if line_payload.product_id is not None
                else product_by_slug[line_payload.product_slug or ""]
            )
            product_name = self._resolve_product_name(product, payload.locale)
            snapshot = build_product_snapshot(product, self.public_media_base_url)

            pack_options = product.pack_options or []
            pack_option = (
                line_payload.pack_option.strip()
                if line_payload.pack_option
                else (pack_options[0] if pack_options else None)
            )
            if pack_option is not None and pack_options and pack_option not in pack_options:
                raise ApiError(
                    status_code=422,
                    code="INVALID_PACK_OPTION",
                    message=f"Pack option '{pack_option}' is not available for {product.sku}.",
                    field_errors={
                        f"lines.{sort_order}.pack_option": ["Choose an available pack option."]
                    },
                )

            req = line_payload.requirements.strip() if line_payload.requirements else None
            inquiry_line = InquiryLine(
                product_id=product.id,
                product_sku=product.sku,
                product_name=product_name,
                pack_option=pack_option,
                product_snapshot=snapshot,
                quantity=line_payload.quantity,
                unit=line_payload.unit.strip(),
                requirements=req,
                sort_order=sort_order,
            )
            inquiry.lines.append(inquiry_line)

        self.repository.add(inquiry)

        try:
            await self.repository.commit()
        except IntegrityError:
            await self.repository.rollback()
            if cleaned_key:
                existing = await self.repository.get_by_idempotency_key(cleaned_key)
                if existing is not None:
                    return inquiry_response(existing)
            raise

        await self.repository.refresh(inquiry)
        return inquiry_response(inquiry)

    @staticmethod
    def _resolve_product_name(product: Product, locale: Locale) -> str:
        for t in product.translations:
            if t.locale == locale and t.name.strip():
                return t.name.strip()
        for t in product.translations:
            if t.name.strip():
                return t.name.strip()
        return product.sku
