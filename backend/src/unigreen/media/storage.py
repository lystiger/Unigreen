from __future__ import annotations

import os
from pathlib import Path, PurePosixPath
from typing import Protocol
from uuid import uuid4

from anyio import to_thread


class Storage(Protocol):
    async def write(self, key: str, content: bytes) -> None: ...

    async def read(self, key: str) -> bytes: ...

    async def delete(self, key: str) -> None: ...


class LocalVolumeStorage:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()

    def _path(self, key: str) -> Path:
        normalized = PurePosixPath(key)
        if normalized.is_absolute() or ".." in normalized.parts or not normalized.parts:
            raise ValueError("Storage keys must be relative and cannot traverse directories.")
        path = (self.root / Path(*normalized.parts)).resolve()
        if not path.is_relative_to(self.root):
            raise ValueError("Storage key resolves outside the configured root.")
        return path

    async def write(self, key: str, content: bytes) -> None:
        path = self._path(key)

        def write_atomic() -> None:
            path.parent.mkdir(parents=True, exist_ok=True)
            temporary = path.with_name(f".{path.name}.{uuid4().hex}.tmp")
            try:
                temporary.write_bytes(content)
                os.replace(temporary, path)
            finally:
                temporary.unlink(missing_ok=True)

        await to_thread.run_sync(write_atomic)

    async def read(self, key: str) -> bytes:
        return await to_thread.run_sync(self._path(key).read_bytes)

    async def delete(self, key: str) -> None:
        await to_thread.run_sync(self._path(key).unlink, True)
