from __future__ import annotations

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from unigreen.api.errors import openapi_error_responses
from unigreen.auth.dependencies import (
    require_mutation_permission,
    require_permission,
)
from unigreen.auth.permissions import Permission
from unigreen.auth.service import AuthContext
from unigreen.db import get_session
from unigreen.domain.enums import InquiryStatus
from unigreen.inquiries.repository import InquiryRepository
from unigreen.inquiries.staff_schemas import (
    InquiryAssignUpdate,
    InquiryInternalNoteCreate,
    InquiryInternalNoteResponse,
    InquiryStatusUpdate,
    StaffInquiryDetailResponse,
    StaffInquiryPage,
    StaffInquiryUpdate,
    StaffSummaryResponse,
)
from unigreen.inquiries.staff_service import StaffInquiryService

router = APIRouter(prefix="/api/v1/staff/inquiries", tags=["staff inquiries"])

ReadContext = Annotated[AuthContext, Depends(require_permission(Permission.INQUIRY_READ))]
WriteContext = Annotated[
    AuthContext, Depends(require_mutation_permission(Permission.INQUIRY_WRITE))
]


def get_staff_inquiry_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StaffInquiryService:
    return StaffInquiryService(InquiryRepository(session))


@router.get(
    "",
    response_model=StaffInquiryPage,
    responses=openapi_error_responses(401, 403),
)
async def list_inquiries(
    _context: ReadContext,
    service: Annotated[StaffInquiryService, Depends(get_staff_inquiry_service)],
    status: Annotated[InquiryStatus | None, Query(description="Filter by inquiry status")] = None,
    search: Annotated[
        str | None,
        Query(description="Search reference, customer name, company, email, phone"),
    ] = None,
    assigned_staff_id: Annotated[
        UUID | None, Query(description="Filter by assigned staff user ID")
    ] = None,
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
) -> StaffInquiryPage:
    return await service.list_inquiries(
        status=status,
        search=search,
        assigned_staff_id=assigned_staff_id,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/assignees",
    response_model=list[StaffSummaryResponse],
    responses=openapi_error_responses(401, 403),
)
async def list_assignees(
    _context: ReadContext,
    service: Annotated[StaffInquiryService, Depends(get_staff_inquiry_service)],
) -> list[StaffSummaryResponse]:
    return await service.list_assignable_staff()


@router.get(
    "/{inquiry_id}",
    response_model=StaffInquiryDetailResponse,
    responses=openapi_error_responses(401, 403, 404),
)
async def get_inquiry(
    inquiry_id: UUID,
    _context: ReadContext,
    service: Annotated[StaffInquiryService, Depends(get_staff_inquiry_service)],
) -> StaffInquiryDetailResponse:
    return await service.get_inquiry(inquiry_id)


@router.patch(
    "/{inquiry_id}/status",
    response_model=StaffInquiryDetailResponse,
    responses=openapi_error_responses(401, 403, 404, 409, 422),
)
async def update_inquiry_status(
    inquiry_id: UUID,
    payload: InquiryStatusUpdate,
    context: WriteContext,
    request: Request,
    service: Annotated[StaffInquiryService, Depends(get_staff_inquiry_service)],
) -> StaffInquiryDetailResponse:
    request_id = getattr(request.state, "request_id", None) or str(uuid4())
    return await service.update_status(
        inquiry_id=inquiry_id,
        status=payload.status,
        actor_staff_id=context.user.id,
        request_id=request_id,
        version=payload.version,
    )


@router.patch(
    "/{inquiry_id}/assign",
    response_model=StaffInquiryDetailResponse,
    responses=openapi_error_responses(401, 403, 404, 409, 422),
)
async def assign_inquiry(
    inquiry_id: UUID,
    payload: InquiryAssignUpdate,
    context: WriteContext,
    request: Request,
    service: Annotated[StaffInquiryService, Depends(get_staff_inquiry_service)],
) -> StaffInquiryDetailResponse:
    request_id = getattr(request.state, "request_id", None) or str(uuid4())
    return await service.assign_inquiry(
        inquiry_id=inquiry_id,
        assigned_staff_id=payload.assigned_staff_id,
        actor_staff_id=context.user.id,
        request_id=request_id,
        version=payload.version,
    )


@router.patch(
    "/{inquiry_id}",
    response_model=StaffInquiryDetailResponse,
    responses=openapi_error_responses(401, 403, 404, 409, 422),
)
async def update_inquiry(
    inquiry_id: UUID,
    payload: StaffInquiryUpdate,
    context: WriteContext,
    request: Request,
    service: Annotated[StaffInquiryService, Depends(get_staff_inquiry_service)],
) -> StaffInquiryDetailResponse:
    request_id = getattr(request.state, "request_id", None) or str(uuid4())
    return await service.update_inquiry(
        inquiry_id=inquiry_id,
        payload=payload,
        actor_staff_id=context.user.id,
        request_id=request_id,
    )


@router.post(
    "/{inquiry_id}/notes",
    response_model=InquiryInternalNoteResponse,
    status_code=status.HTTP_201_CREATED,
    responses=openapi_error_responses(401, 403, 404, 422),
)
async def add_internal_note(
    inquiry_id: UUID,
    payload: InquiryInternalNoteCreate,
    context: WriteContext,
    request: Request,
    service: Annotated[StaffInquiryService, Depends(get_staff_inquiry_service)],
) -> InquiryInternalNoteResponse:
    request_id = getattr(request.state, "request_id", None) or str(uuid4())
    return await service.add_internal_note(
        inquiry_id=inquiry_id,
        content=payload.content,
        actor_staff_id=context.user.id,
        request_id=request_id,
    )
