"""Add secure product media metadata.

Revision ID: 20260727_0004
Revises: 20260727_0003
Create Date: 2026-07-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260727_0004"
down_revision: str | None = "20260727_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUID = postgresql.UUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "product_media",
        sa.Column("id", UUID, nullable=False),
        sa.Column("product_id", UUID, nullable=False),
        sa.Column("storage_key", sa.String(500), nullable=False),
        sa.Column("checksum_sha256", sa.String(64), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("detected_mime_type", sa.String(50), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("alt_vi", sa.String(500), nullable=False),
        sa.Column("alt_en", sa.String(500), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False),
        sa.Column("variants", sa.JSON(), nullable=False),
        sa.Column("source_reference", sa.String(500), nullable=True),
        sa.Column("approval_status", sa.String(20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("sort_order >= 0", name="ck_product_media_sort_order"),
        sa.CheckConstraint("size_bytes > 0", name="ck_product_media_size_bytes"),
        sa.CheckConstraint("width > 0 AND height > 0", name="ck_product_media_dimensions"),
        sa.CheckConstraint(
            "approval_status IN ('pending', 'approved', 'rejected')",
            name="ck_product_media_approval_status",
        ),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key"),
    )
    op.create_index("ix_product_media_product_id", "product_media", ["product_id"])
    op.create_index("ix_product_media_approval_status", "product_media", ["approval_status"])
    op.create_index(
        "uq_product_media_primary_per_product",
        "product_media",
        ["product_id"],
        unique=True,
        postgresql_where=sa.text("is_primary"),
    )


def downgrade() -> None:
    op.drop_index("uq_product_media_primary_per_product", table_name="product_media")
    op.drop_index("ix_product_media_approval_status", table_name="product_media")
    op.drop_index("ix_product_media_product_id", table_name="product_media")
    op.drop_table("product_media")
