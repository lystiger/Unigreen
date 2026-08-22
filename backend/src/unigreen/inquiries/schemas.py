from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from unigreen.domain.enums import InquiryStatus, Locale


class PublicInquiryLineCreate(BaseModel):
    product_id: UUID
    quantity: Decimal = Field(gt=Decimal("0"), decimal_places=2, max_digits=12)
    unit: str = Field(min_length=1, max_length=50)
    requirements: str | None = Field(default=None, max_length=2000)

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Unit cannot be blank.")
        return trimmed


class PublicInquiryCreate(BaseModel):
    contact_name: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=3, max_length=320)
    phone: str | None = Field(default=None, max_length=50)
    company_name: str | None = Field(default=None, max_length=200)
    tax_code: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=500)
    destination: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=5000)
    oem_requirements: str | None = Field(default=None, max_length=5000)
    locale: Locale = Locale.VI
    lines: list[PublicInquiryLineCreate] = Field(min_length=1)

    @field_validator("contact_name")
    @classmethod
    def validate_contact_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Contact name cannot be blank.")
        return trimmed

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        trimmed = value.strip()
        if "@" not in trimmed or "." not in trimmed.split("@")[-1]:
            raise ValueError("Invalid email address format.")
        return trimmed


class PublicInquiryLineResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_sku: str
    product_name: str
    quantity: Decimal
    unit: str
    requirements: str | None
    sort_order: int


class PublicInquiryResponse(BaseModel):
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
    created_at: datetime
    lines: list[PublicInquiryLineResponse]
