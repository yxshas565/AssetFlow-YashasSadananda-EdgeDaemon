"""add booking overlap exclude constraint

Revision ID: 0002_booking_exclude
Revises: 0001_initial
Create Date: 2026-07-12

This migration is deliberately separate from the initial schema migration
so the overlap-prevention decision is visible and reviewable on its own
in the migration history.

Enforces "no two Upcoming/Ongoing bookings for the same resource may
overlap in time" AT THE DATABASE LAYER using a GiST exclusion constraint
over a tsrange. This replaces the naive check-then-insert pattern (which
is vulnerable to race conditions under concurrent requests) with a
constraint Postgres itself guarantees can never be violated.
"""
from alembic import op

revision = "0002_booking_exclude"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")
    op.execute(
        """
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_no_overlap
        EXCLUDE USING GIST (
          resource_id WITH =,
          tsrange(start_ts, end_ts, '[)') WITH &&
        ) WHERE (status IN ('Upcoming', 'Ongoing'));
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;")
