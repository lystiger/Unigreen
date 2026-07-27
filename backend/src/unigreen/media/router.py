from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Request, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from unigreen.api.errors import openapi_error_responses
from unigreen.auth.dependencies import require_mutation_permission, require_permission
from unigreen.auth.permissions import Permission
from unigreen.auth.service import AuthContext
from unigreen.config import Settings, get_settings
from unigreen.db import get_session
from unigreen.media.repository import MediaRepository
from unigreen.media.schemas import MediaReorder, MediaResponse, MediaUpdate
from unigreen.media.service import MediaService
from unigreen.media.storage import LocalVolumeStorage

router = APIRouter(tags=["product media"])

ReadContext = Annotated[AuthContext, Depends(require_permission(Permission.CATALOGUE_READ))]
WriteContext = Annotated[
    AuthContext, Depends(require_mutation_permission(Permission.CATALOGUE_WRITE))
]


def get_media_service(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> MediaService:
    return MediaService(
        MediaRepository(session),
        LocalVolumeStorage(settings.storage_root),
        settings.public_media_base_url,
    )


@router.get(
    "/api/v1/staff/products/{product_id}/media",
    response_model=list[MediaResponse],
    responses=openapi_error_responses(401, 403, 404),
)
async def list_media(
    product_id: UUID,
    _context: ReadContext,
    service: Annotated[MediaService, Depends(get_media_service)],
) -> list[MediaResponse]:
    return await service.list_media(product_id)


@router.post(
    "/api/v1/staff/products/{product_id}/media",
    response_model=MediaResponse,
    status_code=status.HTTP_201_CREATED,
    responses=openapi_error_responses(401, 403, 404, 409, 413, 415, 422),
)
async def upload_media(
    product_id: UUID,
    request: Request,
    context: WriteContext,
    service: Annotated[MediaService, Depends(get_media_service)],
    file: Annotated[UploadFile, File()],
    alt_vi: Annotated[str, Form(max_length=500)] = "",
    alt_en: Annotated[str, Form(max_length=500)] = "",
    source_reference: Annotated[str | None, Form(max_length=500)] = None,
) -> MediaResponse:
    return await service.upload(
        product_id,
        file,
        alt_vi=alt_vi,
        alt_en=alt_en,
        source_reference=source_reference,
        actor_id=context.user.id,
        request_id=request.state.request_id,
    )


@router.patch(
    "/api/v1/staff/products/{product_id}/media/{media_id}",
    response_model=MediaResponse,
    responses=openapi_error_responses(401, 403, 404, 422),
)
async def update_media(
    product_id: UUID,
    media_id: UUID,
    payload: MediaUpdate,
    request: Request,
    context: WriteContext,
    service: Annotated[MediaService, Depends(get_media_service)],
) -> MediaResponse:
    return await service.update(
        product_id,
        media_id,
        payload,
        actor_id=context.user.id,
        request_id=request.state.request_id,
    )


@router.post(
    "/api/v1/staff/products/{product_id}/media/reorder",
    response_model=list[MediaResponse],
    responses=openapi_error_responses(401, 403, 404, 422),
)
async def reorder_media(
    product_id: UUID,
    payload: MediaReorder,
    request: Request,
    context: WriteContext,
    service: Annotated[MediaService, Depends(get_media_service)],
) -> list[MediaResponse]:
    return await service.reorder(
        product_id,
        payload,
        actor_id=context.user.id,
        request_id=request.state.request_id,
    )


@router.delete(
    "/api/v1/staff/products/{product_id}/media/{media_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=openapi_error_responses(401, 403, 404),
)
async def delete_media(
    product_id: UUID,
    media_id: UUID,
    request: Request,
    context: WriteContext,
    service: Annotated[MediaService, Depends(get_media_service)],
) -> None:
    await service.delete(
        product_id,
        media_id,
        actor_id=context.user.id,
        request_id=request.state.request_id,
    )


@router.get(
    "/api/v1/staff/products/{product_id}/media/{media_id}/original",
    responses=openapi_error_responses(401, 403, 404),
)
async def original_media(
    product_id: UUID,
    media_id: UUID,
    _context: ReadContext,
    service: Annotated[MediaService, Depends(get_media_service)],
) -> Response:
    content, content_type, filename = await service.original(product_id, media_id)
    return Response(
        content,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/api/v1/public/media/{media_id}/{variant}",
    responses=openapi_error_responses(404),
)
async def public_media(
    media_id: UUID,
    variant: str,
    service: Annotated[MediaService, Depends(get_media_service)],
) -> Response:
    content, content_type = await service.public_variant(media_id, variant)
    return Response(
        content,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=86400, immutable"},
    )
