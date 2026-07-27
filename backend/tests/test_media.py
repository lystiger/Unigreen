from __future__ import annotations

from io import BytesIO
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi import UploadFile
from httpx import AsyncClient
from PIL import Image

from unigreen.api.errors import ApiError
from unigreen.audit.models import AuditEvent
from unigreen.catalogue.models import Product
from unigreen.domain.enums import PublicationStatus
from unigreen.media.models import ProductMedia
from unigreen.media.processing import process_image, sanitize_filename
from unigreen.media.repository import MediaRepository
from unigreen.media.schemas import (
    MediaApprovalStatus,
    MediaReorder,
    MediaUpdate,
)
from unigreen.media.service import MediaService
from unigreen.media.storage import LocalVolumeStorage


def image_bytes(
    image_format: str = "PNG",
    *,
    size: tuple[int, int] = (1200, 600),
    metadata: bool = False,
) -> bytes:
    output = BytesIO()
    image = Image.new("RGB", size, (42, 120, 80))
    options: dict[str, object] = {}
    if metadata and image_format == "JPEG":
        exif = Image.Exif()
        exif[0x010E] = "private production note"
        options["exif"] = exif
    image.save(output, format=image_format, **options)
    return output.getvalue()


def upload(content: bytes, filename: str = "product.png") -> UploadFile:
    return UploadFile(file=BytesIO(content), filename=filename)


def product(product_id: UUID | None = None) -> Product:
    return Product(
        id=product_id or uuid4(),
        sku="UG-001",
        slug="tissue",
        status=PublicationStatus.DRAFT,
        oem_available=False,
        featured=False,
        sort_order=0,
        version=1,
        translations=[],
        category_links=[],
        specifications=[],
        media=[],
    )


class FakeStorage:
    def __init__(self) -> None:
        self.files: dict[str, bytes] = {}
        self.fail_write_at: int | None = None
        self.write_calls = 0

    async def write(self, key: str, content: bytes) -> None:
        self.write_calls += 1
        if self.fail_write_at == self.write_calls:
            raise OSError("storage unavailable")
        self.files[key] = content

    async def read(self, key: str) -> bytes:
        if key not in self.files:
            raise FileNotFoundError(key)
        return self.files[key]

    async def delete(self, key: str) -> None:
        self.files.pop(key, None)


class FakeMediaRepository:
    def __init__(self, item: Product | None = None) -> None:
        self.product = item
        self.media: dict[UUID, ProductMedia] = {}
        self.audits: list[AuditEvent] = []
        self.commits = 0
        self.rollbacks = 0
        self.commit_error: Exception | None = None

    async def get_product(self, product_id: UUID) -> Product | None:
        if self.product is None or self.product.id != product_id:
            return None
        self.product.media = sorted(self.media.values(), key=lambda item: item.sort_order)
        return self.product

    async def get_media(self, product_id: UUID, media_id: UUID) -> ProductMedia | None:
        item = self.media.get(media_id)
        return item if item is not None and item.product_id == product_id else None

    async def get_public_variant(self, media_id: UUID) -> ProductMedia | None:
        item = self.media.get(media_id)
        if (
            item is None
            or item.approval_status != "approved"
            or self.product is None
            or self.product.status != PublicationStatus.PUBLISHED
        ):
            return None
        return item

    async def count(self, product_id: UUID) -> int:
        return sum(item.product_id == product_id for item in self.media.values())

    async def clear_primary(self, product_id: UUID, *, excluding: UUID | None = None) -> None:
        for item in self.media.values():
            if item.product_id == product_id and item.id != excluding:
                item.is_primary = False

    def add(self, media: ProductMedia) -> None:
        self.media[media.id] = media

    def add_audit(self, event: AuditEvent) -> None:
        self.audits.append(event)

    async def delete(self, media: ProductMedia) -> None:
        self.media.pop(media.id)

    async def commit(self) -> None:
        self.commits += 1
        if self.commit_error is not None:
            raise self.commit_error

    async def rollback(self) -> None:
        self.rollbacks += 1
        self.media.clear()


def service(
    repository: FakeMediaRepository,
    storage: FakeStorage | None = None,
) -> tuple[MediaService, FakeStorage]:
    actual_storage = storage or FakeStorage()
    return (
        MediaService(
            repository,  # type: ignore[arg-type]
            actual_storage,
            "https://media.example.test/api/v1/public/media",
        ),
        actual_storage,
    )


@pytest.mark.parametrize(
    ("image_format", "expected_mime", "extension"),
    [
        ("JPEG", "image/jpeg", "jpg"),
        ("PNG", "image/png", "png"),
        ("WEBP", "image/webp", "webp"),
    ],
)
def test_image_processor_accepts_formats_and_generates_webp_without_upscaling(
    tmp_path: Path,
    image_format: str,
    expected_mime: str,
    extension: str,
) -> None:
    path = tmp_path / "input.bin"
    path.write_bytes(image_bytes(image_format))

    processed = process_image(path, "../../Customer artwork!!.exe")

    assert processed.detected_mime_type == expected_mime
    assert processed.original_filename == f"Customer-artwork.{extension}"
    assert [item.width for item in processed.variants] == [480, 960, 1200]
    assert all(item.width <= processed.width for item in processed.variants)
    with Image.open(BytesIO(processed.variants[0].content)) as variant:
        assert variant.format == "WEBP"
        assert variant.size == (480, 240)


def test_processor_strips_metadata_rejects_fake_and_limits_decoded_area(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    jpeg = tmp_path / "metadata.jpg"
    jpeg.write_bytes(image_bytes("JPEG", metadata=True))
    processed = process_image(jpeg, "metadata.jpg")
    with Image.open(BytesIO(processed.original)) as normalized:
        assert normalized.getexif() == {}

    fake = tmp_path / "fake.jpg"
    fake.write_bytes(b"#!/bin/sh\nrm something")
    with pytest.raises(ApiError) as invalid:
        process_image(fake, "renamed.jpg")
    assert invalid.value.code == "INVALID_IMAGE"

    import unigreen.media.processing as processing

    monkeypatch.setattr(processing, "MAX_IMAGE_PIXELS", 3)
    excessive = tmp_path / "excessive.png"
    excessive.write_bytes(image_bytes(size=(2, 2)))
    with pytest.raises(ApiError) as dimensions:
        process_image(excessive, "too-large.png")
    assert dimensions.value.code == "IMAGE_DIMENSIONS_EXCEEDED"


def test_filename_sanitization_never_preserves_paths() -> None:
    assert sanitize_filename(None, "png") == "upload.png"
    assert sanitize_filename("../../..", "jpg") == "upload.jpg"


@pytest.mark.asyncio
async def test_volume_storage_is_atomic_and_blocks_traversal(tmp_path: Path) -> None:
    storage = LocalVolumeStorage(tmp_path)
    await storage.write("products/one/image.webp", b"safe")
    assert await storage.read("products/one/image.webp") == b"safe"
    await storage.delete("products/one/image.webp")
    with pytest.raises(FileNotFoundError):
        await storage.read("products/one/image.webp")
    with pytest.raises(ValueError):
        await storage.write("../escape", b"unsafe")
    with pytest.raises(ValueError):
        await storage.read("/absolute")


@pytest.mark.asyncio
async def test_media_lifecycle_requires_approval_and_bilingual_alt_text() -> None:
    catalogue_product = product()
    repository = FakeMediaRepository(catalogue_product)
    media_service, storage = service(repository)
    actor_id = uuid4()

    response = await media_service.upload(
        catalogue_product.id,
        upload(image_bytes()),
        alt_vi="  Khăn giấy  ",
        alt_en=" Tissue ",
        source_reference="  studio-approval-42 ",
        actor_id=actor_id,
        request_id="upload-request",
    )
    media_id = response.id
    assert response.approval_status == MediaApprovalStatus.PENDING
    assert response.is_primary is False
    assert response.source_reference == "studio-approval-42"
    assert len(response.variants) == 3
    assert len(storage.files) == 4
    assert repository.audits[-1].action == "media.uploaded"

    listed = await media_service.list_media(catalogue_product.id)
    assert [item.id for item in listed] == [media_id]
    original, content_type, filename = await media_service.original(catalogue_product.id, media_id)
    assert original
    assert content_type == "image/png"
    assert filename == "product.png"
    private_variant, private_variant_type = await media_service.variant(
        catalogue_product.id,
        media_id,
        response.variants[0].name,
    )
    assert private_variant
    assert private_variant_type == "image/webp"

    with pytest.raises(ApiError) as unapproved_primary:
        await media_service.update(
            catalogue_product.id,
            media_id,
            MediaUpdate(is_primary=True),
            actor_id=actor_id,
            request_id="update-request",
        )
    assert unapproved_primary.value.code == "PRIMARY_MEDIA_MUST_BE_APPROVED"

    approved = await media_service.update(
        catalogue_product.id,
        media_id,
        MediaUpdate(
            approval_status=MediaApprovalStatus.APPROVED,
            is_primary=True,
        ),
        actor_id=actor_id,
        request_id="approval-request",
    )
    assert approved.is_primary is True
    catalogue_product.status = PublicationStatus.PUBLISHED
    variant_content, variant_type = await media_service.public_variant(
        media_id, approved.variants[0].name
    )
    assert variant_content
    assert variant_type == "image/webp"

    await media_service.delete(
        catalogue_product.id,
        media_id,
        actor_id=actor_id,
        request_id="delete-request",
    )
    assert repository.media == {}
    assert storage.files == {}
    assert repository.audits[-1].action == "media.deleted"
    assert catalogue_product.status == PublicationStatus.UNPUBLISHED
    assert any(item.action == "product.unpublished" for item in repository.audits)


@pytest.mark.asyncio
async def test_media_update_primary_switch_reorder_and_validation() -> None:
    catalogue_product = product()
    repository = FakeMediaRepository(catalogue_product)
    media_service, _ = service(repository)
    first = await media_service.upload(
        catalogue_product.id,
        upload(image_bytes(size=(300, 150)), "one.png"),
        alt_vi="Một",
        alt_en="One",
        source_reference=None,
        actor_id=uuid4(),
        request_id="one",
    )
    second = await media_service.upload(
        catalogue_product.id,
        upload(image_bytes(size=(300, 150)), "two.png"),
        alt_vi="Hai",
        alt_en="Two",
        source_reference=None,
        actor_id=uuid4(),
        request_id="two",
    )
    for media_id in (first.id, second.id):
        await media_service.update(
            catalogue_product.id,
            media_id,
            MediaUpdate(
                approval_status=MediaApprovalStatus.APPROVED,
                is_primary=True,
            ),
            actor_id=uuid4(),
            request_id="approve",
        )
    assert repository.media[first.id].is_primary is False
    assert repository.media[second.id].is_primary is True

    reordered = await media_service.reorder(
        catalogue_product.id,
        MediaReorder(media_ids=[second.id, first.id]),
        actor_id=uuid4(),
        request_id="reorder",
    )
    assert [item.id for item in reordered] == [second.id, first.id]
    assert [item.sort_order for item in reordered] == [0, 1]

    with pytest.raises(ApiError) as mismatch:
        await media_service.reorder(
            catalogue_product.id,
            MediaReorder(media_ids=[first.id]),
            actor_id=uuid4(),
            request_id="bad-reorder",
        )
    assert mismatch.value.code == "MEDIA_REORDER_MISMATCH"

    repository.media[first.id].alt_en = ""
    with pytest.raises(ApiError) as alt_required:
        await media_service.update(
            catalogue_product.id,
            first.id,
            MediaUpdate(approval_status=MediaApprovalStatus.APPROVED),
            actor_id=uuid4(),
            request_id="missing-alt",
        )
    assert alt_required.value.code == "MEDIA_ALT_TEXT_REQUIRED"


@pytest.mark.asyncio
async def test_upload_limits_invalid_files_and_cleans_storage_on_failures(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    catalogue_product = product()
    repository = FakeMediaRepository(catalogue_product)
    for index in range(5):
        item = ProductMedia(
            id=uuid4(),
            product_id=catalogue_product.id,
            storage_key=f"existing/{index}",
            checksum_sha256="0" * 64,
            original_filename="existing.png",
            detected_mime_type="image/png",
            size_bytes=1,
            width=1,
            height=1,
            alt_vi="Một",
            alt_en="One",
            sort_order=index,
            is_primary=False,
            variants={},
            source_reference=None,
            approval_status="pending",
        )
        repository.media[item.id] = item
    media_service, storage = service(repository)
    with pytest.raises(ApiError) as limit:
        await media_service.upload(
            catalogue_product.id,
            upload(image_bytes()),
            alt_vi="",
            alt_en="",
            source_reference=None,
            actor_id=uuid4(),
            request_id="limit",
        )
    assert limit.value.code == "MEDIA_LIMIT_REACHED"

    repository.media.clear()
    with pytest.raises(ApiError) as invalid:
        await media_service.upload(
            catalogue_product.id,
            upload(b"<svg></svg>", "fake.jpg"),
            alt_vi="",
            alt_en="",
            source_reference=None,
            actor_id=uuid4(),
            request_id="fake",
        )
    assert invalid.value.code == "INVALID_IMAGE"

    import unigreen.media.service as media_service_module

    monkeypatch.setattr(media_service_module, "MAX_UPLOAD_BYTES", 3)
    with pytest.raises(ApiError) as too_large:
        await media_service.upload(
            catalogue_product.id,
            upload(b"1234", "large.png"),
            alt_vi="",
            alt_en="",
            source_reference=None,
            actor_id=uuid4(),
            request_id="large",
        )
    assert too_large.value.code == "UPLOAD_TOO_LARGE"
    monkeypatch.setattr(media_service_module, "MAX_UPLOAD_BYTES", 10 * 1024 * 1024)

    storage.fail_write_at = 2
    with pytest.raises(OSError):
        await media_service.upload(
            catalogue_product.id,
            upload(image_bytes()),
            alt_vi="Một",
            alt_en="One",
            source_reference=None,
            actor_id=uuid4(),
            request_id="storage-fail",
        )
    assert storage.files == {}
    assert repository.rollbacks == 1

    storage.fail_write_at = None
    repository.commit_error = RuntimeError("database unavailable")
    with pytest.raises(RuntimeError):
        await media_service.upload(
            catalogue_product.id,
            upload(image_bytes()),
            alt_vi="Một",
            alt_en="One",
            source_reference=None,
            actor_id=uuid4(),
            request_id="database-fail",
        )
    assert storage.files == {}
    assert repository.media == {}


@pytest.mark.asyncio
async def test_missing_and_private_media_are_not_disclosed() -> None:
    missing_service, _ = service(FakeMediaRepository())
    product_id = uuid4()
    with pytest.raises(ApiError) as product_missing:
        await missing_service.list_media(product_id)
    assert product_missing.value.code == "PRODUCT_NOT_FOUND"

    catalogue_product = product(product_id)
    repository = FakeMediaRepository(catalogue_product)
    media_service, _ = service(repository)
    with pytest.raises(ApiError) as media_missing:
        await media_service.public_variant(uuid4(), "w480")
    assert media_missing.value.code == "MEDIA_NOT_FOUND"

    item = ProductMedia(
        id=uuid4(),
        product_id=product_id,
        storage_key="original",
        checksum_sha256="0" * 64,
        original_filename="one.png",
        detected_mime_type="image/png",
        size_bytes=1,
        width=1,
        height=1,
        alt_vi="Một",
        alt_en="One",
        sort_order=0,
        is_primary=False,
        variants={"w1": {"storage_key": "missing", "width": 1, "height": 1, "size_bytes": 1}},
        source_reference=None,
        approval_status="approved",
    )
    repository.media[item.id] = item
    catalogue_product.status = PublicationStatus.PUBLISHED
    with pytest.raises(ApiError) as file_missing:
        await media_service.public_variant(item.id, "w1")
    assert file_missing.value.code == "MEDIA_NOT_FOUND"


def test_media_schema_rejects_empty_updates_and_duplicate_reorder() -> None:
    with pytest.raises(ValueError):
        MediaUpdate()
    media_id = uuid4()
    with pytest.raises(ValueError):
        MediaReorder(media_ids=[media_id, media_id])


@pytest.mark.asyncio
async def test_media_repository_queries_and_mutations() -> None:
    catalogue_product = product()
    media = ProductMedia(
        id=uuid4(),
        product_id=catalogue_product.id,
        storage_key="original",
        checksum_sha256="0" * 64,
        original_filename="one.png",
        detected_mime_type="image/png",
        size_bytes=1,
        width=1,
        height=1,
        alt_vi="Một",
        alt_en="One",
        sort_order=0,
        is_primary=True,
        variants={},
        source_reference=None,
        approval_status="approved",
    )
    session = MagicMock()
    session.scalar = AsyncMock(side_effect=[catalogue_product, media, media, 1])
    session.execute = AsyncMock()
    session.delete = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    repository = MediaRepository(session)

    assert await repository.get_product(catalogue_product.id) is catalogue_product
    assert await repository.get_media(catalogue_product.id, media.id) is media
    assert await repository.get_public_variant(media.id) is media
    assert await repository.count(catalogue_product.id) == 1
    await repository.clear_primary(catalogue_product.id, excluding=media.id)
    repository.add(media)
    audit = AuditEvent(
        actor_staff_id=uuid4(),
        action="media.tested",
        entity_type="media",
        entity_id=media.id,
        request_id="test",
        change_summary={},
    )
    repository.add_audit(audit)
    await repository.delete(media)
    await repository.commit()
    await repository.rollback()

    assert session.add.call_count == 2
    session.execute.assert_awaited_once()
    session.delete.assert_awaited_once_with(media)
    session.commit.assert_awaited_once()
    session.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_media_upload_requires_authentication(client: AsyncClient) -> None:
    response = await client.post(
        f"/api/v1/staff/products/{uuid4()}/media",
        files={"file": ("product.png", image_bytes(), "image/png")},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"
