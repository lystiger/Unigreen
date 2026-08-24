"""Add inquiry tables and reference sequence.

Revision ID: 20260822_0005
Revises: 20260727_0004
Create Date: 2026-08-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260822_0005"
down_revision: str | None = "20260727_0004"
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
        "inquiry_sequences",
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("last_value", sa.Integer(), nullable=False),
        sa.CheckConstraint("year >= 2020", name="ck_inquiry_sequences_year"),
        sa.CheckConstraint("last_value >= 0", name="ck_inquiry_sequences_last_value"),
        sa.PrimaryKeyConstraint("year"),
    )
    op.create_table(
        "inquiries",
        sa.Column("id", UUID, nullable=False),
        sa.Column("reference", sa.String(32), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("contact_name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("company_name", sa.String(200), nullable=True),
        sa.Column("tax_code", sa.String(50), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("destination", sa.String(200), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("oem_requirements", sa.Text(), nullable=True),
        sa.Column("locale", sa.String(2), nullable=False),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("assigned_staff_id", UUID, nullable=True),
        sa.Column("idempotency_key", sa.String(255), nullable=True),
        *timestamps(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "status IN ('new', 'qualified', 'quoted', 'won', 'lost', 'spam', 'duplicate')",
            name="ck_inquiries_status",
        ),
        sa.CheckConstraint("version >= 1", name="ck_inquiries_version"),
        sa.ForeignKeyConstraint(["assigned_staff_id"], ["staff_users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    for column, unique in (
        ("reference", True),
        ("status", False),
        ("email", False),
        ("assigned_staff_id", False),
        ("created_at", False),
    ):
        op.create_index(f"ix_inquiries_{column}", "inquiries", [column], unique=unique)

    op.create_index(
        "ix_inquiries_idempotency_key",
        "inquiries",
        ["idempotency_key"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )

    op.create_table(
        "inquiry_lines",
        sa.Column("id", UUID, nullable=False),
        sa.Column("inquiry_id", UUID, nullable=False),
        sa.Column("product_id", UUID, nullable=False),
        sa.Column("product_sku", sa.String(100), nullable=False),
        sa.Column("product_name", sa.String(200), nullable=False),
        sa.Column("product_snapshot", sa.JSON(), nullable=False),
        sa.Column("quantity", sa.Numeric(12, 2), nullable=False),
        sa.Column("unit", sa.String(50), nullable=False),
        sa.Column("requirements", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        *timestamps(),
        sa.CheckConstraint("quantity > 0", name="ck_inquiry_lines_quantity_positive"),
        sa.CheckConstraint("sort_order >= 0", name="ck_inquiry_lines_sort_order"),
        sa.ForeignKeyConstraint(["inquiry_id"], ["inquiries.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inquiry_lines_inquiry_id", "inquiry_lines", ["inquiry_id"])
    op.create_index("ix_inquiry_lines_product_id", "inquiry_lines", ["product_id"])


def downgrade() -> None:
    op.drop_index("ix_inquiry_lines_product_id", table_name="inquiry_lines")
    op.drop_index("ix_inquiry_lines_inquiry_id", table_name="inquiry_lines")
    op.drop_table("inquiry_lines")
    op.drop_index("ix_inquiries_idempotency_key", table_name="inquiries")
    for column in ("created_at", "assigned_staff_id", "email", "status", "reference"):
        op.drop_index(f"ix_inquiries_{column}", table_name="inquiries")
    op.drop_table("inquiries")
    op.drop_table("inquiry_sequences")
