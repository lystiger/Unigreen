from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from unigreen.domain.enums import InquiryStatus, Locale, StaffRole, StaffStatus


class PaginationMetadata(BaseModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
    total: int = Field(ge=0)
    total_pages: int = Field(ge=0)


class StaffSummaryResponse(BaseModel):
    id: UUID
    email: str
    role: StaffRole
    status: StaffStatus


class InquiryInternalNoteResponse(BaseModel):
    id: UUID
    inquiry_id: UUID
    author_staff_id: UUID
    author_email: str
    content: str
    created_at: datetime
    updated_at: datetime


class InquiryInternalNoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Note content cannot be blank.")
        return trimmed


class StaffInquiryLineResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_sku: str
    product_name: str
    pack_option: str | None
    product_snapshot: dict[str, object]
    quantity: Decimal
    unit: str
    requirements: str | None
    sort_order: int
    created_at: datetime


class StaffInquirySummaryResponse(BaseModel):
    id: UUID
    reference: str
    status: InquiryStatus
    contact_name: str
    email: str
    phone: str | None
    company_name: str | None
    destination: str | None
    locale: Locale
    assigned_staff_id: UUID | None
    assigned_staff: StaffSummaryResponse | None
    lines_count: int
    created_at: datetime
    updated_at: datetime
    version: int


class StaffInquiryPage(BaseModel):
    items: list[StaffInquirySummaryResponse]
    pagination: PaginationMetadata


class StaffInquiryDetailResponse(BaseModel):
    id: UUID
    reference: str
    status: InquiryStatus
    contact_name: str
    email: str
    phone: str | None
    company_name: str | None
    tax_code: str | None
    address: str | None
    destination: str | None
    notes: str | None
    oem_requirements: str | None
    locale: Locale
    source: str
    assigned_staff_id: UUID | None
    assigned_staff: StaffSummaryResponse | None
    created_at: datetime
    updated_at: datetime
    version: int
    lines: list[StaffInquiryLineResponse]
    internal_notes: list[InquiryInternalNoteResponse]


class InquiryStatusUpdate(BaseModel):
    status: InquiryStatus
    version: int | None = None


class InquiryAssignUpdate(BaseModel):
    assigned_staff_id: UUID | None = None
    version: int | None = None


class StaffInquiryUpdate(BaseModel):
    status: InquiryStatus | None = None
    assigned_staff_id: UUID | None = None
    clear_assigned_staff: bool = False
    version: int | None = None
