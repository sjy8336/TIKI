"""add project settings fields

Revision ID: 20260626_0006
Revises: 20260619_0005
Create Date: 2026-06-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260626_0006"
down_revision: str | None = "20260619_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("visibility", sa.String(length=20), server_default="members", nullable=False),
    )
    op.add_column(
        "projects",
        sa.Column("meeting_template", sa.String(length=50), server_default="basic", nullable=False),
    )
    op.add_column("projects", sa.Column("jira_domain", sa.String(length=255), nullable=True))
    op.add_column("projects", sa.Column("jira_email", sa.String(length=255), nullable=True))
    op.add_column("projects", sa.Column("jira_token", sa.Text(), nullable=True))
    op.add_column("projects", sa.Column("notion_database_id", sa.String(length=255), nullable=True))
    op.add_column("projects", sa.Column("notion_token", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "notion_token")
    op.drop_column("projects", "notion_database_id")
    op.drop_column("projects", "jira_token")
    op.drop_column("projects", "jira_email")
    op.drop_column("projects", "jira_domain")
    op.drop_column("projects", "meeting_template")
    op.drop_column("projects", "visibility")
