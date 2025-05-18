"""create_initial_tables

Revision ID: b7a91a81d9c2
Revises:
Create Date: 2025-05-16 14:17:11.580856

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = "b7a91a81d9c2"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === Users Table ===
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("first_name", sa.String(), nullable=False),
        sa.Column("last_name", sa.String(), nullable=False),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # === Families Table ===
    op.create_table(
        "families",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "name", sa.String(), nullable=False
        ),  # Assuming name is not nullable based on Mapped[str]
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )

    # === FamilyMembers Table ===
    op.create_table(
        "family_members",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "joined_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_family_members_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["family_id"],
            ["families.id"],
            name=op.f("fk_family_members_family_id_families"),
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "user_id", "family_id", name=op.f("uq_family_members_user_id_family_id")
        ),  # Matches 'uq_user_family'
    )
    # Add indexes if needed for user_id and family_id in family_members if they are frequently queried

    # === Tasks Table (Example Start - you'll need to complete this) ===
    op.create_table(
        "tasks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assignee_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_by_id", postgresql.UUID(as_uuid=True), nullable=False
        ),  # Assuming created_by_id is not nullable
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("priority", sa.String(), nullable=False, server_default="medium"),
        sa.Column(
            "is_routine", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.Column(
            "parent_id", postgresql.UUID(as_uuid=True), nullable=True
        ),  # For subtasks
        sa.ForeignKeyConstraint(
            ["family_id"],
            ["families.id"],
            name=op.f("fk_tasks_family_id_families"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["assignee_id"],
            ["users.id"],
            name=op.f("fk_tasks_assignee_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
            name=op.f("fk_tasks_created_by_id_users"),
            ondelete="SET NULL",
        ),  # or CASCADE if user deletion should delete their created tasks
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["tasks.id"],
            name=op.f("fk_tasks_parent_id_tasks"),
            ondelete="CASCADE",
        ),
    )
    # Add indexes for frequently queried foreign keys in tasks, e.g., family_id, assignee_id, parent_id

    # === Tags Table ===
    op.create_table(
        "tags",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("color", sa.String(), nullable=True),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["family_id"],
            ["families.id"],
            name=op.f("fk_tags_family_id_families"),
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "name", "family_id", name=op.f("uq_tags_name_family_id")
        ),  # Matches 'uq_tag_name_family'
    )

    # === task_tags Association Table ===
    op.create_table(
        "task_tags",
        sa.Column("task_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["tasks.id"],
            name=op.f("fk_task_tags_task_id_tasks"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"],
            ["tags.id"],
            name=op.f("fk_task_tags_tag_id_tags"),
            ondelete="CASCADE",
        ),
    )

    # === RefreshTokens Table ===
    op.create_table(
        "refresh_tokens",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "token", sa.String(), nullable=False, unique=True
        ),  # unique=True here is fine, index will be created below
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "is_revoked", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_refresh_tokens_user_id_users"),
            ondelete="CASCADE",
        ),
    )
    op.create_index(
        op.f("ix_refresh_tokens_token"), "refresh_tokens", ["token"], unique=True
    )
    op.create_index(
        op.f("ix_refresh_tokens_user_id"), "refresh_tokens", ["user_id"], unique=False
    )  # Index for user_id FK


def downgrade() -> None:
    op.drop_index(op.f("ix_refresh_tokens_user_id"), table_name="refresh_tokens")
    op.drop_index(op.f("ix_refresh_tokens_token"), table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
    op.drop_table("task_tags")
    op.drop_table("tags")
    # Drop indexes for tasks table if you added them
    op.drop_table("tasks")
    # Drop indexes for family_members table if you added them
    op.drop_table("family_members")
    op.drop_table("families")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
