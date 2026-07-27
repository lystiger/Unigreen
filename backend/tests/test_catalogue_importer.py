from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

import unigreen.catalogue.importer as importer
from unigreen.catalogue.importer import (
    CatalogueDraftManifest,
    build_draft_entities,
    import_drafts,
    load_manifest,
)
from unigreen.domain.enums import PublicationStatus


def valid_manifest() -> CatalogueDraftManifest:
    return CatalogueDraftManifest.model_validate(
        {
            "format_version": 1,
            "approval_reference": None,
            "categories": [
                {
                    "slug": "Khăn giấy",
                    "translations": [
                        {"locale": "vi", "name": "Khăn giấy"},
                        {"locale": "en", "name": "Tissue"},
                    ],
                }
            ],
            "products": [
                {
                    "sku": " ug  001 ",
                    "slug": "Sản phẩm nháp",
                    "category_slugs": ["Khăn giấy"],
                    "translations": [
                        {
                            "locale": "vi",
                            "name": "Sản phẩm nháp",
                            "summary": "Chưa được phê duyệt để xuất bản.",
                        }
                    ],
                    "specifications": [
                        {
                            "key": "Basis weight",
                            "value": "15",
                            "unit": "g/m²",
                            "translations": [{"locale": "vi", "label": "Định lượng"}],
                        }
                    ],
                }
            ],
        }
    )


def test_build_import_entities_always_creates_drafts() -> None:
    categories, products = build_draft_entities(valid_manifest())

    assert categories[0].slug == "khan-giay"
    assert categories[0].status == PublicationStatus.DRAFT
    assert products[0].sku == "UG-001"
    assert products[0].slug == "san-pham-nhap"
    assert products[0].status == PublicationStatus.DRAFT
    assert products[0].published_at is None
    assert products[0].category_links[0].category_id == categories[0].id
    assert products[0].specifications[0].key == "basis_weight"


def test_manifest_rejects_unknown_categories_and_duplicate_skus() -> None:
    payload = valid_manifest().model_dump(mode="json")
    payload["products"][0]["category_slugs"] = ["missing"]
    with pytest.raises(ValidationError, match="Unknown product category"):
        CatalogueDraftManifest.model_validate(payload)

    payload = valid_manifest().model_dump(mode="json")
    payload["products"].append({**payload["products"][0], "slug": "another"})
    with pytest.raises(ValidationError, match="Product SKUs must be unique"):
        CatalogueDraftManifest.model_validate(payload)


@pytest.mark.parametrize(
    ("change", "message"),
    [
        (("categories", 0, "slug", "!!!"), "category slug"),
        (("products", 0, "slug", "!!!"), "product slug"),
        (("products", 0, "category_slugs", ["Khăn giấy", "khan-giay"]), "repeats a category"),
        (("products", 0, "specifications", []), None),
    ],
)
def test_manifest_validation_cases(
    change: tuple[str, int, str, Any],
    message: str | None,
) -> None:
    payload = valid_manifest().model_dump(mode="json")
    collection, index, field, value = change
    payload[collection][index][field] = value
    if message is None:
        CatalogueDraftManifest.model_validate(payload)
    else:
        with pytest.raises(ValidationError, match=message):
            CatalogueDraftManifest.model_validate(payload)


def test_manifest_rejects_parent_cycles_and_duplicate_barcodes() -> None:
    payload = valid_manifest().model_dump(mode="json")
    second_category = {
        **payload["categories"][0],
        "slug": "parent",
        "parent_slug": "Khăn giấy",
    }
    payload["categories"][0]["parent_slug"] = "parent"
    payload["categories"].append(second_category)
    with pytest.raises(ValidationError, match="cycle"):
        CatalogueDraftManifest.model_validate(payload)

    payload = valid_manifest().model_dump(mode="json")
    payload["products"][0]["barcode"] = "123"
    payload["products"].append({**payload["products"][0], "sku": "UG-002", "slug": "another"})
    with pytest.raises(ValidationError, match="barcodes"):
        CatalogueDraftManifest.model_validate(payload)


def test_manifest_rejects_duplicate_translation_and_specification_keys() -> None:
    payload = valid_manifest().model_dump(mode="json")
    payload["categories"][0]["translations"][1]["locale"] = "vi"
    with pytest.raises(ValidationError, match="translation locale"):
        CatalogueDraftManifest.model_validate(payload)

    payload = valid_manifest().model_dump(mode="json")
    payload["products"][0]["specifications"].append(
        {**payload["products"][0]["specifications"][0], "key": "basis-weight"}
    )
    with pytest.raises(ValidationError, match="specification key"):
        CatalogueDraftManifest.model_validate(payload)


class FakeSession:
    def __init__(self, commit_error: IntegrityError | None = None) -> None:
        self.entities: list[object] = []
        self.commit_error = commit_error
        self.rolled_back = False

    async def __aenter__(self) -> FakeSession:
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    def add_all(self, entities: list[object]) -> None:
        self.entities.extend(entities)

    async def commit(self) -> None:
        if self.commit_error:
            raise self.commit_error

    async def rollback(self) -> None:
        self.rolled_back = True


@pytest.mark.asyncio
async def test_import_is_atomic_and_maps_database_conflicts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = FakeSession()
    monkeypatch.setattr(importer, "session_factory", lambda: session)
    assert await import_drafts(valid_manifest()) == (1, 1)
    assert len(session.entities) == 2

    conflict = IntegrityError("insert", {}, Exception("duplicate"))
    session = FakeSession(conflict)
    monkeypatch.setattr(importer, "session_factory", lambda: session)
    with pytest.raises(ValueError, match="conflicts with existing"):
        await import_drafts(valid_manifest())
    assert session.rolled_back is True


def test_cli_check_never_writes(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    example = Path(__file__).parents[1] / "examples" / "catalogue-draft-import.json"
    monkeypatch.setattr(
        "sys.argv",
        ["unigreen-import-catalogue", "--input", str(example), "--check"],
    )
    importer.main()
    assert "Valid draft manifest: 0 categories, 0 products." in capsys.readouterr().out


def test_empty_example_manifest_is_valid() -> None:
    manifest = load_manifest(Path(__file__).parents[1] / "examples" / "catalogue-draft-import.json")
    assert manifest.categories == []
    assert manifest.products == []
