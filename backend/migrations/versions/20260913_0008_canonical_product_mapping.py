"""Add canonical_product_id to products.

Revision ID: 20260913_0008
Revises: 20260912_0007
Create Date: 2026-09-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260913_0008"
down_revision: str | None = "20260912_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("products", sa.Column("canonical_product_id", sa.String(36), nullable=True))
    # A plain unique index: PostgreSQL treats NULLs as distinct, so any number of
    # unmapped entries coexist while a canonical product maps to at most one.
    op.create_index(
        "ix_products_canonical_product_id",
        "products",
        ["canonical_product_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_products_canonical_product_id", table_name="products")
    op.drop_column("products", "canonical_product_id")
