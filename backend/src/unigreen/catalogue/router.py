from __future__ import annotations

from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from unigreen.api.errors import ApiError, openapi_error_responses
from unigreen.auth.dependencies import (
    require_mutation_permission,
    require_permission,
)
from unigreen.auth.permissions import Permission
from unigreen.auth.service import AuthContext
from unigreen.catalogue.repository import CatalogueRepository
from unigreen.catalogue.responses import category_response, product_response
from unigreen.catalogue.schemas import (
    CanonicalProductResponse,
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
from unigreen.integrations.uniops import (
    CanonicalProduct,
    CanonicalProductDraft,
    CanonicalProductSource,
    UniOpsClient,
)

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


def get_canonical_products(
    settings: Annotated[Settings, Depends(get_settings)],
) -> CanonicalProductSource:
    if not settings.uniops_base_url or not settings.uniops_catalog_key:
        raise ApiError(
            status_code=503,
            code="UNIOPS_NOT_CONFIGURED",
            message="The UniOps product master is not configured for this catalogue.",
        )
    return UniOpsClient(settings.uniops_base_url, settings.uniops_catalog_key)


CanonicalProducts = Annotated[CanonicalProductSource, Depends(get_canonical_products)]


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
    mapping_status: Annotated[Literal["mapped", "unmapped"] | None, Query()] = None,
) -> list[ProductResponse]:
    products = await service.repository.list_products(mapping_status=mapping_status)
    return [product_response(item) for item in products]


@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    responses=openapi_error_responses(401, 403, 409, 422, 502, 503),
)
async def create_product(
    payload: ProductCreate,
    _context: WriteContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
    products: CanonicalProducts,
) -> ProductResponse:
    return product_response(await service.create_product(payload, products))


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
    responses=openapi_error_responses(401, 403, 404, 409, 422, 502, 503),
)
async def map_product(
    product_id: UUID,
    payload: ProductMapRequest,
    request: Request,
    context: WriteContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
    products: CanonicalProducts,
) -> ProductResponse:
    return product_response(
        await service.map_canonical_product(
            product_id,
            payload.canonical_product_id,
            products,
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


async def _canonical_response(
    service: CatalogueService, items: list[CanonicalProduct]
) -> list[CanonicalProductResponse]:
    mapped = {
        item.canonical_product_id: item.id
        for item in await service.repository.list_products(mapping_status="mapped")
    }
    return [
        CanonicalProductResponse(
            id=item.id,
            sku=item.sku,
            name=item.name,
            unit=item.unit,
            category=item.category,
            status=item.status,
            specifications=item.specifications,
            easybooks_code=item.code,
            easybooks_material_goods_id=item.easybooks_material_goods_id,
            mapped_catalogue_product_id=mapped.get(str(item.id)),
        )
        for item in items
    ]


@router.get(
    "/canonical-products",
    response_model=list[CanonicalProductResponse],
    responses=openapi_error_responses(401, 403, 502, 503),
)
async def list_canonical_products(
    _context: ReadContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
    products: CanonicalProducts,
    search: Annotated[str | None, Query(max_length=100)] = None,
    product_status: Annotated[
        Literal["active", "discontinued"] | None, Query(alias="status")
    ] = None,
) -> list[CanonicalProductResponse]:
    items = await products.list_products(search=search, status=product_status)
    return await _canonical_response(service, items)


@router.post(
    "/canonical-products",
    response_model=CanonicalProductResponse,
    status_code=status.HTTP_201_CREATED,
    responses=openapi_error_responses(401, 403, 409, 422, 502, 503),
)
async def create_canonical_product(
    payload: CanonicalProductDraft,
    _context: WriteContext,
    service: Annotated[CatalogueService, Depends(get_catalogue_service)],
    products: CanonicalProducts,
) -> CanonicalProductResponse:
    """Ask UniOps for a new canonical product when no existing one matches.

    UniOps assigns the SKU. The new product is not mapped by this call; staff
    map it explicitly afterwards.
    """
    created = await products.create_product(payload)
    return (await _canonical_response(service, [created]))[0]
