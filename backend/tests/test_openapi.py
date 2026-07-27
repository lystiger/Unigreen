from unigreen.main import app


def test_openapi_has_versioned_contract_path() -> None:
    schema = app.openapi()

    assert schema["info"]["title"] == "Uni-Green API"
    assert schema["info"]["version"] == "0.1.0"
    assert "/health/live" in schema["paths"]
    assert "/health/ready" in schema["paths"]
