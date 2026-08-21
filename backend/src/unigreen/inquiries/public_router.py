from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.ext.asyncio import AsyncSession

from unigreen.api.errors import openapi_error_responses
from unigreen.config import Settings, get_settings
from unigreen.db import get_session
from unigreen.inquiries.repository import InquiryRepository
from unigreen.inquiries.schemas import PublicInquiryCreate, PublicInquiryResponse
from unigreen.inquiries.service import PublicInquiryService

router = APIRouter(prefix="/api/v1/public", tags=["public inquiries"])


def get_public_inquiry_service(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> PublicInquiryService:
    return PublicInquiryService(
        InquiryRepository(session),
        settings.public_media_base_url,
    )


@router.post(
    "/inquiries",
    response_model=PublicInquiryResponse,
    status_code=status.HTTP_201_CREATED,
    responses=openapi_error_responses(404, 422),
)
async def create_inquiry(
    payload: PublicInquiryCreate,
    service: Annotated[PublicInquiryService, Depends(get_public_inquiry_service)],
    idempotency_key: Annotated[
        str | None,
        Header(
            alias="Idempotency-Key",
            description="Optional idempotency key to prevent duplicate submissions.",
            max_length=255,
        ),
    ] = None,
) -> PublicInquiryResponse:
    return await service.create_inquiry(payload, idempotency_key=idempotency_key)
