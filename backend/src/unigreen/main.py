from __future__ import annotations

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from unigreen import __version__
from unigreen.api.errors import ApiError, api_error_handler, validation_error_handler
from unigreen.api.middleware import RequestIdMiddleware
from unigreen.auth.router import router as auth_router
from unigreen.catalogue.public_router import router as public_catalogue_router
from unigreen.catalogue.router import router as catalogue_router
from unigreen.config import get_settings
from unigreen.health import router as health_router
from unigreen.logging import configure_logging
from unigreen.media.router import router as media_router


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging()

    application = FastAPI(
        title=settings.app_name,
        version=__version__,
        description="Contract-first API for the Uni-Green B2B sales platform.",
        openapi_url="/api/v1/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.add_middleware(RequestIdMiddleware)
    application.add_exception_handler(ApiError, api_error_handler)  # type: ignore[arg-type]
    application.add_exception_handler(
        RequestValidationError,
        validation_error_handler,  # type: ignore[arg-type]
    )
    application.include_router(health_router)
    application.include_router(auth_router)
    application.include_router(catalogue_router)
    application.include_router(public_catalogue_router)
    application.include_router(media_router)
    return application


app = create_app()
