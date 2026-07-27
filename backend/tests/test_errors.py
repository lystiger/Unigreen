from fastapi import Request
from fastapi.exceptions import RequestValidationError

from unigreen.api.errors import (
    ApiError,
    api_error_handler,
    openapi_error_responses,
    validation_error_handler,
)


def make_request(request_id: str | None = None) -> Request:
    request = Request({"type": "http", "method": "GET", "path": "/", "headers": []})
    if request_id is not None:
        request.state.request_id = request_id
    return request


async def test_api_error_handler_returns_standard_envelope() -> None:
    error = ApiError(
        status_code=404,
        code="PRODUCT_NOT_FOUND",
        message="The product was not found.",
        field_errors={"slug": ["Unknown product."]},
    )

    response = await api_error_handler(make_request("req-123"), error)

    assert response.status_code == 404
    assert b'"code":"PRODUCT_NOT_FOUND"' in response.body
    assert b'"request_id":"req-123"' in response.body


async def test_validation_error_groups_errors_by_field() -> None:
    error = RequestValidationError(
        [
            {
                "type": "missing",
                "loc": ("body", "email"),
                "msg": "Field required",
                "input": {},
            },
            {
                "type": "value_error",
                "loc": ("query", "page"),
                "msg": "Must be positive",
                "input": 0,
            },
        ]
    )

    response = await validation_error_handler(make_request(), error)

    assert response.status_code == 422
    assert b'"email":["Field required"]' in response.body
    assert b'"query.page":["Must be positive"]' in response.body
    assert b'"request_id":"unknown"' in response.body


def test_openapi_error_responses_use_the_shared_model() -> None:
    responses = openapi_error_responses(400, 404)

    assert set(responses) == {400, 404}
    assert responses[400]["description"] == "Request failed"
