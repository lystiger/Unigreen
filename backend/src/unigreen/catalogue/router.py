from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from unigreen.api.errors import openapi_error_responses
from unigreen.auth.dependencies import (
    require_mutation_permission,
    require_permission,
)
from unigreen.auth.permissions import Permission
from unigreen.auth.service import AuthContext
from unigreen.catalogue.repository import CatalogueRepository
from unigreen.catalogue.responses import category_response, product_response
from unigreen.catalogue.schemas import (
    CanonicalProductCreate,
    CanonicalProductRead,
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    ProductCreate,
    ProductMapRequest,
    ProductResponse,
    ProductUpdate,
    SpecificationReplace,
)
from unigreen.catalogue.service import CatalogueService
from unigreen.config import Settings, get_settings
from unigreen.db import get_session
from unigreen.integrations.uniops import CanonicalProductCreatePayload, UniOpsClient

router = APIRouter(prefix="/api/v1/staff", tags=["staff catalogue"])

ReadContext = Annotated[AuthContext, Depends(require_permission(Permission.CATALOGUE_READ))]
WriteContext = Annotated[
    AuthContext, Depends(require_mutation_permission(Permission.CATALOGUE_WRITE))
]
PublishContext = Annotated[
    AuthContext, Depends(require_mutation_permission(Permission.CATALOGUE_PUBLISH))
]


def get_catalogue_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CatalogueService:
    return CatalogueService(CatalogueRepository(session))


def get_uniops_client(
    settings: Annotated[Settings, Depends(get_settings)],
) -> UniOpsClient:
    return UniOpsClient(base_url=settings.uniops_base_url, api_key=settings.uniops_api_key)


@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(
    _context: ReadContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
) -> list[CategoryResponse]:
    categories = await service.repository.list_categories()
    return [category_response(item) for item in categories]


@router.post(
    "/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    responses=openapi_error_responses(401, 403, 409, 422),
)
async def create_category(
    payload: CategoryCreate,
    _context: WriteContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
) -> CategoryResponse:
    return category_response(await service.create_category(payload))


@router.get(
    "/categories/{category_id}",
    response_model=CategoryResponse,
    responses=openapi_error_responses(401, 403, 404),
)
async def get_category(
    category_id: UUID,
    _context: ReadContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
) -> CategoryResponse:
    return category_response(await service._category_or_404(category_id))


@router.patch(
    "/categories/{category_id}",
    response_model=CategoryResponse,
    responses=openapi_error_responses(401, 403, 404, 409, 422),
)
async def update_category(
    category_id: UUID,
    payload: CategoryUpdate,
    _context: WriteContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
) -> CategoryResponse:
    return category_response(await service.update_category(category_id, payload))


@router.post(
    "/categories/{category_id}/publish",
    response_model=CategoryResponse,
    responses=openapi_error_responses(401, 403, 404, 422),
)
async def publish_category(
    category_id: UUID,
    request: Request,
    context: PublishContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
) -> CategoryResponse:
    return category_response(
        await service.publish_category(
            category_id,
            actor_id=context.user.id,
            request_id=request.state.request_id,
        )
    )


@router.post(
    "/categories/{category_id}/unpublish",
    response_model=CategoryResponse,
    responses=openapi_error_responses(401, 403, 404),
)
async def unpublish_category(
    category_id: UUID,
    request: Request,
    context: PublishContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
) -> CategoryResponse:
    return category_response(
        await service.unpublish_category(
            category_id,
            actor_id=context.user.id,
            request_id=request.state.request_id,
        )
    )


@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=openapi_error_responses(401, 403, 404, 409),
)
async def delete_category(
    category_id: UUID,
    request: Request,
    context: WriteContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
) -> None:
    await service.delete_category(
        category_id,
        actor_id=context.user.id,
        request_id=request.state.request_id,
    )


@router.get("/products", response_model=list[ProductResponse])
async def list_products(
    _context: ReadContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
    mapping_status: Annotated[str | None, Query()] = None,
) -> list[ProductResponse]:
    products = await service.repository.list_products(mapping_status=mapping_status)
    return [product_response(item) for item in products]


@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    responses=openapi_error_responses(401, 403, 404, 409, 422),
)
async def create_product(
    payload: ProductCreate,
    _context: WriteContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
    uniops_client: Annotated[UniOpsClient, Depends(get_uniops_client)],
) -> ProductResponse:
    return product_response(await service.create_product(payload, client=uniops_client))


@router.get(
    "/products/{product_id}",
    response_model=ProductResponse,
    responses=openapi_error_responses(401, 403, 404),
)
async def get_product(
    product_id: UUID,
    _context: ReadContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
) -> ProductResponse:
    return product_response(await service._product_or_404(product_id))


@router.patch(
    "/products/{product_id}",
    response_model=ProductResponse,
    responses=openapi_error_responses(401, 403, 404, 409, 422),
)
async def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    _context: WriteContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
) -> ProductResponse:
    return product_response(await service.update_product(product_id, payload))


@router.put(
    "/products/{product_id}/specifications",
    response_model=ProductResponse,
    responses=openapi_error_responses(401, 403, 404, 409, 422),
)
async def replace_specifications(
    product_id: UUID,
    payload: SpecificationReplace,
    _context: WriteContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
) -> ProductResponse:
    return product_response(await service.replace_specifications(product_id, payload))


@router.post(
    "/products/{product_id}/publish",
    response_model=ProductResponse,
    responses=openapi_error_responses(401, 403, 404, 422),
)
async def publish_product(
    product_id: UUID,
    request: Request,
    context: PublishContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
) -> ProductResponse:
    return product_response(
        await service.publish_product(
            product_id,
            actor_id=context.user.id,
            request_id=request.state.request_id,
            has_primary_media=await service.repository.has_approved_primary_media(product_id),
        )
    )


@router.post(
    "/products/{product_id}/unpublish",
    response_model=ProductResponse,
    responses=openapi_error_responses(401, 403, 404),
)
async def unpublish_product(
    product_id: UUID,
    request: Request,
    context: PublishContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
) -> ProductResponse:
    return product_response(
        await service.unpublish_product(
            product_id,
            actor_id=context.user.id,
            request_id=request.state.request_id,
        )
    )


@router.delete(
    "/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=openapi_error_responses(401, 403, 404, 409),
)
async def delete_product(
    product_id: UUID,
    request: Request,
    context: WriteContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
) -> None:
    await service.delete_product(
        product_id,
        actor_id=context.user.id,
        request_id=request.state.request_id,
    )


@router.post(
    "/products/{product_id}/map",
    response_model=ProductResponse,
    responses=openapi_error_responses(401, 403, 404, 409),
)
async def map_product(
    product_id: UUID,
    payload: ProductMapRequest,
    request: Request,
    context: WriteContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
    uniops_client: Annotated[UniOpsClient, Depends(get_uniops_client)],
) -> ProductResponse:
    return product_response(
        await service.map_canonical_product(
            product_id,
            payload.canonical_product_id,
            uniops_client,
            actor_id=context.user.id,
            request_id=request.state.request_id,
        )
    )


@router.post(
    "/products/{product_id}/unmap",
    response_model=ProductResponse,
    responses=openapi_error_responses(401, 403, 404),
)
async def unmap_product(
    product_id: UUID,
    request: Request,
    context: WriteContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
) -> ProductResponse:
    return product_response(
        await service.unmap_canonical_product(
            product_id,
            actor_id=context.user.id,
            request_id=request.state.request_id,
        )
    )


@router.get("/canonical-products", response_model=list[CanonicalProductRead])
async def list_canonical_products(
    _context: ReadContext,
    uniops_client: Annotated[UniOpsClient, Depends(get_uniops_client)],
    search: Annotated[str | None, Query()] = None,
    category: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
) -> list[CanonicalProductRead]:
    products = await uniops_client.list_products(search=search, category=category, status=status)
    return [CanonicalProductRead(**p.model_dump()) for p in products]


@router.post(
    "/canonical-products",
    response_model=CanonicalProductRead,
    status_code=status.HTTP_201_CREATED,
    responses=openapi_error_responses(401, 403, 422),
)
async def create_canonical_product(
    payload: CanonicalProductCreate,
    _context: WriteContext,
    uniops_client: Annotated[UniOpsClient, Depends(get_uniops_client)],
) -> CanonicalProductRead:
    created = await uniops_client.create_product(
        CanonicalProductCreatePayload(**payload.model_dump())
    )
    return CanonicalProductRead(**created.model_dump())
