"""Establish the Sprint 0 migration baseline.

Revision ID: 20260727_0001
Revises:
Create Date: 2026-07-27
"""

from collections.abc import Sequence

revision: str = "20260727_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the intentionally empty foundation schema."""


def downgrade() -> None:
    """Remove the intentionally empty foundation schema."""
