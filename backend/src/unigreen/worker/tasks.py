from __future__ import annotations

import dramatiq

from unigreen.worker.broker import broker as broker


@dramatiq.actor(max_retries=3)
def heartbeat() -> str:
    """Minimal actor used to verify worker discovery and queue connectivity."""
    return "ok"
