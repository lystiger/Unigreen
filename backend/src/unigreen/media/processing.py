from __future__ import annotations

import hashlib
import re
import warnings
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from unigreen.api.errors import ApiError

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 24_000_000
VARIANT_WIDTHS = (480, 960, 1600)
ALLOWED_FORMATS = {
    "JPEG": ("image/jpeg", "jpg"),
    "PNG": ("image/png", "png"),
    "WEBP": ("image/webp", "webp"),
}


@dataclass(frozen=True)
class ProcessedVariant:
    width: int
    height: int
    content: bytes


@dataclass(frozen=True)
class ProcessedImage:
    original: bytes
    detected_mime_type: str
    extension: str
    width: int
    height: int
    checksum_sha256: str
    original_filename: str
    variants: tuple[ProcessedVariant, ...]


def sanitize_filename(filename: str | None, extension: str) -> str:
    basename = Path(filename or f"upload.{extension}").name
    stem = Path(basename).stem
    safe_stem = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip(".-_") or "upload"
    return f"{safe_stem[:240]}.{extension}"


def process_image(path: Path, filename: str | None) -> ProcessedImage:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(path) as source:
                if source.format not in ALLOWED_FORMATS:
                    raise _invalid_image("Only JPEG, PNG, and WebP images are accepted.")
                if getattr(source, "n_frames", 1) != 1:
                    raise _invalid_image("Animated images are not accepted.")
                width, height = source.size
                if width <= 0 or height <= 0 or width * height > MAX_IMAGE_PIXELS:
                    raise ApiError(
                        status_code=413,
                        code="IMAGE_DIMENSIONS_EXCEEDED",
                        message="The decoded image exceeds the 24 megapixel limit.",
                    )
                source.load()
                image = ImageOps.exif_transpose(source)
                detected_mime_type, extension = ALLOWED_FORMATS[source.format]
                original = _encode_original(image, source.format)
                variants = _variants(image)
    except ApiError:
        raise
    except (Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ApiError(
            status_code=413,
            code="IMAGE_DIMENSIONS_EXCEEDED",
            message="The decoded image exceeds the 24 megapixel limit.",
        ) from None
    except (UnidentifiedImageError, OSError, ValueError):
        raise _invalid_image("The upload is not a valid JPEG, PNG, or WebP image.") from None

    return ProcessedImage(
        original=original,
        detected_mime_type=detected_mime_type,
        extension=extension,
        width=image.width,
        height=image.height,
        checksum_sha256=hashlib.sha256(original).hexdigest(),
        original_filename=sanitize_filename(filename, extension),
        variants=variants,
    )


def _encode_original(image: Image.Image, image_format: str) -> bytes:
    output = BytesIO()
    if image_format == "JPEG":
        normalized = image.convert("RGB")
        normalized.save(output, format="JPEG", quality=92, optimize=True)
    elif image_format == "PNG":
        normalized = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        normalized.save(output, format="PNG", optimize=True)
    else:
        normalized = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        normalized.save(output, format="WEBP", quality=90, method=6)
    return output.getvalue()


def _variants(image: Image.Image) -> tuple[ProcessedVariant, ...]:
    widths = sorted({min(image.width, target) for target in VARIANT_WIDTHS})
    variants: list[ProcessedVariant] = []
    base = image.convert("RGBA" if "A" in image.getbands() else "RGB")
    for width in widths:
        height = max(1, round(image.height * width / image.width))
        resized = (
            base.copy()
            if (width, height) == base.size
            else base.resize((width, height), Image.Resampling.LANCZOS)
        )
        output = BytesIO()
        resized.save(output, format="WEBP", quality=82, method=6)
        variants.append(
            ProcessedVariant(
                width=width,
                height=height,
                content=output.getvalue(),
            )
        )
    return tuple(variants)


def _invalid_image(message: str) -> ApiError:
    return ApiError(status_code=415, code="INVALID_IMAGE", message=message)
