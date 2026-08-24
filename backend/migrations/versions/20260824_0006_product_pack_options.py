"""Add selectable product pack options.

Revision ID: 20260824_0006
Revises: 20260822_0005
Create Date: 2026-08-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260824_0006"
down_revision: str | None = "20260822_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column(
            "pack_options",
            sa.JSON(),
            server_default=sa.text("'[]'::json"),
            nullable=False,
        ),
    )
    op.alter_column("products", "pack_options", server_default=None)
    # Preserve the pack formats already published in the checked-in catalogue
    # copy. Other products remain empty until staff configures them explicitly.
    op.execute(
        """
        UPDATE products
        SET pack_options = CASE slug
            WHEN 'toilet-paper' THEN '["10 rolls", "12 rolls"]'::json
            WHEN 'coreless-paper' THEN '["6 rolls", "10 rolls"]'::json
            WHEN 'napkins' THEN '["500 g bag", "1,000 g bag"]'::json
            WHEN 'jumbo-rolls' THEN '["Custom specification"]'::json
            ELSE pack_options
        END
        WHERE slug IN ('toilet-paper', 'coreless-paper', 'napkins', 'jumbo-rolls')
        """
    )
    op.add_column(
        "inquiry_lines",
        sa.Column("pack_option", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("inquiry_lines", "pack_option")
    op.drop_column("products", "pack_options")
