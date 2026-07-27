from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from unigreen.api.errors import openapi_error_responses
from unigreen.catalogue.public_repository import PublicCatalogueRepository
from unigreen.catalogue.public_schemas import (
    PublicCategoryResponse,
    PublicProductDetail,
    PublicProductPage,
    PublicProductQuery,
    PublicProductSort,
)
from unigreen.catalogue.public_service import PublicCatalogueService
from unigreen.config import Settings, get_settings
from unigreen.db import get_session
from unigreen.domain.enums import Locale

router = APIRouter(prefix="/api/v1/public", tags=["public catalogue"])


def get_public_catalogue_service(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> PublicCatalogueService:
    return PublicCatalogueService(
        PublicCatalogueRepository(session),
        settings.public_media_base_url,
    )


def _cache_public(response: Response) -> None:
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"


@router.get("/categories", response_model=list[PublicCategoryResponse])
async def categories(
    locale: Annotated[Locale, Query()],
    response: Response,
    service: Annotated[PublicCatalogueService, Depends(get_public_catalogue_service)],
) -> list[PublicCategoryResponse]:
    _cache_public(response)
    return await service.categories(locale)


@router.get("/products", response_model=PublicProductPage)
async def products(
    response: Response,
    service: Annotated[PublicCatalogueService, Depends(get_public_catalogue_service)],
    locale: Annotated[Locale, Query()],
    category: Annotated[str | None, Query(max_length=160)] = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    featured: bool | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
    sort: PublicProductSort = PublicProductSort.FEATURED,
) -> PublicProductPage:
    _cache_public(response)
    return await service.products(
        PublicProductQuery(
            locale=locale,
            category=category,
            q=q,
            featured=featured,
            page=page,
            page_size=page_size,
            sort=sort,
        )
    )


@router.get(
    "/products/{slug}",
    response_model=PublicProductDetail,
    responses=openapi_error_responses(404, 422),
)
async def product(
    slug: str,
    locale: Annotated[Locale, Query()],
    response: Response,
    service: Annotated[PublicCatalogueService, Depends(get_public_catalogue_service)],
) -> PublicProductDetail:
    _cache_public(response)
    return await service.product(slug, locale)
