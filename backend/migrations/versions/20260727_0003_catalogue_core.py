"""Add bilingual catalogue and audit schema.

Revision ID: 20260727_0003
Revises: 20260727_0002
Create Date: 2026-07-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260727_0003"
down_revision: str | None = "20260727_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUID = postgresql.UUID(as_uuid=True)


def timestamps() -> list[sa.Column[object]]:
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "product_categories",
        sa.Column("id", UUID, nullable=False),
        sa.Column("slug", sa.String(160), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("parent_id", UUID, nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        *timestamps(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.CheckConstraint("sort_order >= 0", name="ck_product_categories_sort_order"),
        sa.CheckConstraint(
            "status IN ('draft', 'published', 'unpublished')",
            name="ck_product_categories_status",
        ),
        sa.ForeignKeyConstraint(["parent_id"], ["product_categories.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_product_categories_parent_id", "product_categories", ["parent_id"])
    op.create_index("ix_product_categories_slug", "product_categories", ["slug"], unique=True)
    op.create_index("ix_product_categories_status", "product_categories", ["status"])
    op.create_table(
        "product_category_translations",
        sa.Column("category_id", UUID, nullable=False),
        sa.Column("locale", sa.String(2), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("meta_title", sa.String(255), nullable=True),
        sa.Column("meta_description", sa.String(500), nullable=True),
        sa.ForeignKeyConstraint(["category_id"], ["product_categories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("category_id", "locale"),
    )
    op.create_table(
        "products",
        sa.Column("id", UUID, nullable=False),
        sa.Column("sku", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(160), nullable=False),
        sa.Column("barcode", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("oem_available", sa.Boolean(), nullable=False),
        sa.Column("featured", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.CheckConstraint("sort_order >= 0", name="ck_products_sort_order"),
        sa.CheckConstraint(
            "status IN ('draft', 'published', 'unpublished')",
            name="ck_products_status",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    for column, unique in (
        ("barcode", True),
        ("featured", False),
        ("sku", True),
        ("slug", True),
        ("status", False),
    ):
        op.create_index(f"ix_products_{column}", "products", [column], unique=unique)
    op.create_table(
        "product_translations",
        sa.Column("product_id", UUID, nullable=False),
        sa.Column("locale", sa.String(2), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("meta_title", sa.String(255), nullable=True),
        sa.Column("meta_description", sa.String(500), nullable=True),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("product_id", "locale"),
    )
    op.create_table(
        "product_category_links",
        sa.Column("product_id", UUID, nullable=False),
        sa.Column("category_id", UUID, nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.CheckConstraint("sort_order >= 0", name="ck_product_category_links_sort_order"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["category_id"], ["product_categories.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("product_id", "category_id"),
    )
    op.create_table(
        "product_specifications",
        sa.Column("id", UUID, nullable=False),
        sa.Column("product_id", UUID, nullable=False),
        sa.Column("key", sa.String(100), nullable=False),
        sa.Column("value", sa.String(500), nullable=False),
        sa.Column("unit", sa.String(50), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("is_highlighted", sa.Boolean(), nullable=False),
        sa.CheckConstraint("sort_order >= 0", name="ck_product_specifications_sort_order"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "key", name="uq_product_specification_key"),
    )
    op.create_index(
        "ix_product_specifications_product_id",
        "product_specifications",
        ["product_id"],
    )
    op.create_table(
        "product_specification_translations",
        sa.Column("specification_id", UUID, nullable=False),
        sa.Column("locale", sa.String(2), nullable=False),
        sa.Column("label", sa.String(200), nullable=False),
        sa.Column("display_value_override", sa.String(500), nullable=True),
        sa.ForeignKeyConstraint(
            ["specification_id"], ["product_specifications.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("specification_id", "locale"),
    )
    op.create_table(
        "audit_events",
        sa.Column("id", UUID, nullable=False),
        sa.Column("actor_staff_id", UUID, nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", UUID, nullable=False),
        sa.Column("request_id", sa.String(100), nullable=False),
        sa.Column("change_summary", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["actor_staff_id"], ["staff_users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in (
        "action",
        "actor_staff_id",
        "created_at",
        "entity_id",
        "entity_type",
        "request_id",
    ):
        op.create_index(f"ix_audit_events_{column}", "audit_events", [column])


def downgrade() -> None:
    for column in (
        "request_id",
        "entity_type",
        "entity_id",
        "created_at",
        "actor_staff_id",
        "action",
    ):
        op.drop_index(f"ix_audit_events_{column}", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_table("product_specification_translations")
    op.drop_index("ix_product_specifications_product_id", table_name="product_specifications")
    op.drop_table("product_specifications")
    op.drop_table("product_category_links")
    op.drop_table("product_translations")
    for column in ("status", "slug", "sku", "featured", "barcode"):
        op.drop_index(f"ix_products_{column}", table_name="products")
    op.drop_table("products")
    op.drop_table("product_category_translations")
    op.drop_index("ix_product_categories_status", table_name="product_categories")
    op.drop_index("ix_product_categories_slug", table_name="product_categories")
    op.drop_index("ix_product_categories_parent_id", table_name="product_categories")
    op.drop_table("product_categories")
