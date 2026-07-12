"""add booking exclude constraint

Revision ID: 6c4689b32321
Revises: 472840d76768
Create Date: 2026-07-12 05:39:18.384627

"""
from alembic import op
import sqlalchemy as sa


revision = "6c4689b32321"
down_revision = "472840d76768"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    op.execute("""
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_no_overlap
        EXCLUDE USING GIST (
            resource_id WITH =,
            tstzrange(start_ts, end_ts, '[)') WITH &&
        ) WHERE (status IN ('UPCOMING', 'ONGOING'))
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE bookings DROP CONSTRAINT bookings_no_overlap")