from __future__ import annotations

from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class MediaApprovalStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class MediaVariantResponse(BaseModel):
    name: str
    width: int
    height: int
    content_type: str
    size_bytes: int
    url: str


class MediaResponse(BaseModel):
    id: UUID
    product_id: UUID
    original_filename: str
    detected_mime_type: str
    size_bytes: int
    width: int
    height: int
    alt_vi: str
    alt_en: str
    sort_order: int
    is_primary: bool
    source_reference: str | None
    approval_status: MediaApprovalStatus
    variants: list[MediaVariantResponse]


class MediaUpdate(BaseModel):
    alt_vi: str | None = Field(default=None, max_length=500)
    alt_en: str | None = Field(default=None, max_length=500)
    is_primary: bool | None = None
    source_reference: str | None = Field(default=None, max_length=500)
    approval_status: MediaApprovalStatus | None = None

    @model_validator(mode="after")
    def require_a_change(self) -> MediaUpdate:
        if not self.model_fields_set:
            raise ValueError("At least one media field must be supplied.")
        return self


class MediaReorder(BaseModel):
    media_ids: list[UUID] = Field(min_length=1, max_length=5)

    @model_validator(mode="after")
    def unique_media(self) -> MediaReorder:
        if len(set(self.media_ids)) != len(self.media_ids):
            raise ValueError("Media IDs must be unique.")
        return self
