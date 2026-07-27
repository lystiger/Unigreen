from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str
    message: str
    field_errors: dict[str, list[str]] = Field(default_factory=dict)
    request_id: str


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


class ApiError(Exception):
    def __init__(
        self,
        *,
        status_code: int,
        code: str,
        message: str,
        field_errors: dict[str, list[str]] | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.field_errors = field_errors or {}


def _request_id(request: Request) -> str:
    return str(getattr(request.state, "request_id", "unknown"))


async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
    payload = ErrorEnvelope(
        error=ErrorDetail(
            code=exc.code,
            message=exc.message,
            field_errors=exc.field_errors,
            request_id=_request_id(request),
        )
    )
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump())


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    field_errors: dict[str, list[str]] = {}
    for error in exc.errors():
        location = ".".join(str(part) for part in error["loc"] if part != "body")
        field_errors.setdefault(location or "request", []).append(str(error["msg"]))

    payload = ErrorEnvelope(
        error=ErrorDetail(
            code="VALIDATION_ERROR",
            message="The request contains invalid data.",
            field_errors=field_errors,
            request_id=_request_id(request),
        )
    )
    return JSONResponse(status_code=422, content=payload.model_dump())


def openapi_error_responses(*status_codes: int) -> dict[int | str, dict[str, Any]]:
    return {
        status: {
            "model": ErrorEnvelope,
            "description": "Request failed",
        }
        for status in status_codes
    }
