from __future__ import annotations

import tempfile
from pathlib import Path
from uuid import UUID, uuid4

from anyio import to_thread
from fastapi import UploadFile

from unigreen.api.errors import ApiError
from unigreen.audit.models import AuditEvent
from unigreen.catalogue.models import Product
from unigreen.domain.enums import PublicationStatus
from unigreen.media.models import ProductMedia
from unigreen.media.processing import MAX_UPLOAD_BYTES, ProcessedImage, process_image
from unigreen.media.repository import MediaRepository
from unigreen.media.schemas import (
    MediaApprovalStatus,
    MediaReorder,
    MediaResponse,
    MediaUpdate,
    MediaVariantResponse,
)
from unigreen.media.storage import Storage

MAX_MEDIA_PER_PRODUCT = 5


class MediaService:
    def __init__(
        self,
        repository: MediaRepository,
        storage: Storage,
        public_media_base_url: str,
    ) -> None:
        self.repository = repository
        self.storage = storage
        self.public_media_base_url = public_media_base_url.rstrip("/")

    async def list_media(self, product_id: UUID) -> list[MediaResponse]:
        product = await self._product_or_404(product_id)
        return [self.response(item) for item in product.media]

    async def upload(
        self,
        product_id: UUID,
        upload: UploadFile,
        *,
        alt_vi: str,
        alt_en: str,
        source_reference: str | None,
        actor_id: UUID,
        request_id: str,
    ) -> MediaResponse:
        await self._product_or_404(product_id)
        if await self.repository.count(product_id) >= MAX_MEDIA_PER_PRODUCT:
            raise ApiError(
                status_code=409,
                code="MEDIA_LIMIT_REACHED",
                message="A product can have at most five media items.",
            )
        processed = await self._read_and_process(upload)
        media_id = uuid4()
        original_key = f"products/{product_id}/media/{media_id}/original.{processed.extension}"
        variants, writes = self._variant_manifest(product_id, media_id, processed)
        writes.insert(0, (original_key, processed.original))
        written_keys: list[str] = []
        try:
            for key, content in writes:
                await self.storage.write(key, content)
                written_keys.append(key)
            media = ProductMedia(
                id=media_id,
                product_id=product_id,
                storage_key=original_key,
                checksum_sha256=processed.checksum_sha256,
                original_filename=processed.original_filename,
                detected_mime_type=processed.detected_mime_type,
                size_bytes=len(processed.original),
                width=processed.width,
                height=processed.height,
                alt_vi=alt_vi.strip(),
                alt_en=alt_en.strip(),
                sort_order=await self.repository.count(product_id),
                is_primary=False,
                variants=variants,
                source_reference=self._optional(source_reference),
                approval_status=MediaApprovalStatus.PENDING.value,
            )
            self.repository.add(media)
            self._audit(
                actor_id,
                "media.uploaded",
                media.id,
                request_id,
                {"product_id": str(product_id), "mime_type": processed.detected_mime_type},
            )
            await self.repository.commit()
        except Exception:
            await self.repository.rollback()
            for key in reversed(written_keys):
                await self.storage.delete(key)
            raise
        return self.response(media)

    async def update(
        self,
        product_id: UUID,
        media_id: UUID,
        payload: MediaUpdate,
        *,
        actor_id: UUID,
        request_id: str,
    ) -> MediaResponse:
        product = await self._product_or_404(product_id)
        media = await self._media_or_404(product_id, media_id)
        was_public_primary = (
            product.status == PublicationStatus.PUBLISHED
            and media.is_primary
            and media.approval_status == MediaApprovalStatus.APPROVED
        )
        fields = payload.model_fields_set
        next_alt_vi = payload.alt_vi.strip() if payload.alt_vi is not None else media.alt_vi
        next_alt_en = payload.alt_en.strip() if payload.alt_en is not None else media.alt_en
        next_approval = payload.approval_status or MediaApprovalStatus(media.approval_status)
        next_primary = payload.is_primary if payload.is_primary is not None else media.is_primary
        if next_approval != MediaApprovalStatus.APPROVED and payload.is_primary is None:
            next_primary = False
        if next_approval == MediaApprovalStatus.APPROVED and (not next_alt_vi or not next_alt_en):
            raise ApiError(
                status_code=422,
                code="MEDIA_ALT_TEXT_REQUIRED",
                message="Approved media requires Vietnamese and English alt text.",
            )
        if next_primary and next_approval != MediaApprovalStatus.APPROVED:
            raise ApiError(
                status_code=422,
                code="PRIMARY_MEDIA_MUST_BE_APPROVED",
                message="Only approved media can be the primary image.",
            )
        if next_primary:
            await self.repository.clear_primary(product_id, excluding=media.id)
        if "alt_vi" in fields:
            media.alt_vi = next_alt_vi
        if "alt_en" in fields:
            media.alt_en = next_alt_en
        if "source_reference" in fields:
            media.source_reference = self._optional(payload.source_reference)
        if payload.approval_status is not None:
            media.approval_status = payload.approval_status.value
            if payload.approval_status != MediaApprovalStatus.APPROVED:
                media.is_primary = False
        if payload.is_primary is not None:
            media.is_primary = payload.is_primary
        if was_public_primary and not next_primary:
            self._unpublish_for_media_change(product, actor_id, request_id)
        self._audit(
            actor_id,
            "media.updated",
            media.id,
            request_id,
            {"fields": sorted(fields)},
        )
        await self.repository.commit()
        return self.response(media)

    async def reorder(
        self,
        product_id: UUID,
        payload: MediaReorder,
        *,
        actor_id: UUID,
        request_id: str,
    ) -> list[MediaResponse]:
        product = await self._product_or_404(product_id)
        existing = {item.id: item for item in product.media}
        if set(payload.media_ids) != set(existing):
            raise ApiError(
                status_code=422,
                code="MEDIA_REORDER_MISMATCH",
                message="The reorder request must include every product media item exactly once.",
            )
        for sort_order, media_id in enumerate(payload.media_ids):
            existing[media_id].sort_order = sort_order
        self._audit(
            actor_id,
            "media.reordered",
            product_id,
            request_id,
            {"media_ids": [str(item) for item in payload.media_ids]},
        )
        await self.repository.commit()
        return [self.response(existing[item]) for item in payload.media_ids]

    async def delete(
        self,
        product_id: UUID,
        media_id: UUID,
        *,
        actor_id: UUID,
        request_id: str,
    ) -> None:
        product = await self._product_or_404(product_id)
        media = await self._media_or_404(product_id, media_id)
        keys = self._all_keys(media)
        if (
            product.status == PublicationStatus.PUBLISHED
            and media.is_primary
            and media.approval_status == MediaApprovalStatus.APPROVED
        ):
            self._unpublish_for_media_change(product, actor_id, request_id)
        self._audit(
            actor_id, "media.deleted", media.id, request_id, {"product_id": str(product_id)}
        )
        await self.repository.delete(media)
        await self.repository.commit()
        for key in keys:
            await self.storage.delete(key)

    async def original(self, product_id: UUID, media_id: UUID) -> tuple[bytes, str, str]:
        media = await self._media_or_404(product_id, media_id)
        return (
            await self.storage.read(media.storage_key),
            media.detected_mime_type,
            media.original_filename,
        )

    async def public_variant(self, media_id: UUID, variant: str) -> tuple[bytes, str]:
        media = await self.repository.get_public_variant(media_id)
        if media is None or variant not in media.variants:
            raise self._media_not_found()
        metadata = media.variants[variant]
        key = metadata.get("storage_key")
        if not isinstance(key, str):
            raise self._media_not_found()
        try:
            return await self.storage.read(key), "image/webp"
        except FileNotFoundError:
            raise self._media_not_found() from None

    def response(self, media: ProductMedia) -> MediaResponse:
        variants = [
            MediaVariantResponse(
                name=name,
                width=int(metadata["width"]),
                height=int(metadata["height"]),
                content_type="image/webp",
                size_bytes=int(metadata["size_bytes"]),
                url=f"{self.public_media_base_url}/{media.id}/{name}",
            )
            for name, metadata in sorted(
                media.variants.items(), key=lambda item: int(item[1]["width"])
            )
        ]
        return MediaResponse(
            id=media.id,
            product_id=media.product_id,
            original_filename=media.original_filename,
            detected_mime_type=media.detected_mime_type,
            size_bytes=media.size_bytes,
            width=media.width,
            height=media.height,
            alt_vi=media.alt_vi,
            alt_en=media.alt_en,
            sort_order=media.sort_order,
            is_primary=media.is_primary,
            source_reference=media.source_reference,
            approval_status=MediaApprovalStatus(media.approval_status),
            variants=variants,
        )

    async def _read_and_process(self, upload: UploadFile) -> ProcessedImage:
        temporary_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(prefix="unigreen-upload-", delete=False) as temporary:
                temporary_path = Path(temporary.name)
                total = 0
                while chunk := await upload.read(1024 * 1024):
                    total += len(chunk)
                    if total > MAX_UPLOAD_BYTES:
                        raise ApiError(
                            status_code=413,
                            code="UPLOAD_TOO_LARGE",
                            message="Product images cannot exceed 10 MiB.",
                        )
                    temporary.write(chunk)
            if total == 0:
                raise ApiError(
                    status_code=415,
                    code="INVALID_IMAGE",
                    message="The uploaded image is empty.",
                )
            return await to_thread.run_sync(process_image, temporary_path, upload.filename)
        finally:
            await upload.close()
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)

    @staticmethod
    def _variant_manifest(
        product_id: UUID,
        media_id: UUID,
        processed: ProcessedImage,
    ) -> tuple[dict[str, dict[str, str | int]], list[tuple[str, bytes]]]:
        manifest: dict[str, dict[str, str | int]] = {}
        writes: list[tuple[str, bytes]] = []
        for variant in processed.variants:
            name = f"w{variant.width}"
            key = f"products/{product_id}/media/{media_id}/variants/{name}.webp"
            manifest[name] = {
                "storage_key": key,
                "width": variant.width,
                "height": variant.height,
                "size_bytes": len(variant.content),
            }
            writes.append((key, variant.content))
        return manifest, writes

    @staticmethod
    def _all_keys(media: ProductMedia) -> list[str]:
        keys = [media.storage_key]
        keys.extend(
            key
            for metadata in media.variants.values()
            if isinstance((key := metadata.get("storage_key")), str)
        )
        return keys

    async def _product_or_404(self, product_id: UUID) -> Product:
        product = await self.repository.get_product(product_id)
        if product is None:
            raise ApiError(
                status_code=404,
                code="PRODUCT_NOT_FOUND",
                message="The product was not found.",
            )
        return product

    async def _media_or_404(self, product_id: UUID, media_id: UUID) -> ProductMedia:
        media = await self.repository.get_media(product_id, media_id)
        if media is None:
            raise self._media_not_found()
        return media

    @staticmethod
    def _media_not_found() -> ApiError:
        return ApiError(
            status_code=404,
            code="MEDIA_NOT_FOUND",
            message="The media item was not found.",
        )

    @staticmethod
    def _optional(value: str | None) -> str | None:
        normalized = value.strip() if value else ""
        return normalized or None

    def _audit(
        self,
        actor_id: UUID,
        action: str,
        entity_id: UUID,
        request_id: str,
        summary: dict[str, object],
    ) -> None:
        self.repository.add_audit(
            AuditEvent(
                actor_staff_id=actor_id,
                action=action,
                entity_type="media",
                entity_id=entity_id,
                request_id=request_id,
                change_summary=summary,
            )
        )

    def _unpublish_for_media_change(
        self,
        product: Product,
        actor_id: UUID,
        request_id: str,
    ) -> None:
        product.status = PublicationStatus.UNPUBLISHED
        product.version += 1
        self._audit(
            actor_id,
            "product.unpublished",
            product.id,
            request_id,
            {"reason": "approved_primary_media_removed"},
        )
