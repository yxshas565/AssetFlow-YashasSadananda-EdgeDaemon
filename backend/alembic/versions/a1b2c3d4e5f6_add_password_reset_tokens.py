"""add password reset tokens table

Revision ID: a1b2c3d4e5f6
Revises: 6c4689b32321
Create Date: 2026-07-12 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4e5f6"
down_revision = "6c4689b32321"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_password_reset_tokens_employee_id",
        "password_reset_tokens",
        ["employee_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_password_reset_tokens_employee_id", table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")