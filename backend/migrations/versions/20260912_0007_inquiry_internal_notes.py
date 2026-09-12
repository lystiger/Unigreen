"""Add inquiry internal notes table.

Revision ID: 20260912_0007
Revises: 20260824_0006
Create Date: 2026-09-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260912_0007"
down_revision: str | None = "20260824_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUID = postgresql.UUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "inquiry_internal_notes",
        sa.Column("id", UUID, nullable=False),
        sa.Column("inquiry_id", UUID, nullable=False),
        sa.Column("author_staff_id", UUID, nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
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
        sa.CheckConstraint(
            "length(trim(content)) > 0",
            name="ck_inquiry_internal_notes_content_non_empty",
        ),
        sa.ForeignKeyConstraint(["inquiry_id"], ["inquiries.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_staff_id"], ["staff_users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_inquiry_internal_notes_inquiry_id",
        "inquiry_internal_notes",
        ["inquiry_id"],
    )
    op.create_index(
        "ix_inquiry_internal_notes_author_staff_id",
        "inquiry_internal_notes",
        ["author_staff_id"],
    )
    op.create_index(
        "ix_inquiry_internal_notes_created_at",
        "inquiry_internal_notes",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_inquiry_internal_notes_created_at", table_name="inquiry_internal_notes")
    op.drop_index(
        "ix_inquiry_internal_notes_author_staff_id",
        table_name="inquiry_internal_notes",
    )
    op.drop_index("ix_inquiry_internal_notes_inquiry_id", table_name="inquiry_internal_notes")
    op.drop_table("inquiry_internal_notes")
