from datetime import datetime, timezone

from sqlalchemy import ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import BookingStatusEnum


class Booking(Base):
    """
    Overlap prevention is enforced at the DATABASE layer, not in application
    code — see alembic/versions/0002_booking_exclude_constraint.py, which adds:

        ALTER TABLE bookings
        ADD CONSTRAINT bookings_no_overlap
        EXCLUDE USING GIST (
          resource_id WITH =,
          tsrange(start_ts, end_ts, '[)') WITH &&
        ) WHERE (status IN ('Upcoming', 'Ongoing'));

    This means two overlapping bookings for the same resource can never both
    commit, even under concurrent requests — Postgres rejects the second
    INSERT/UPDATE with an IntegrityError, which the booking router catches
    and returns as a 409 Conflict. No manual "check then insert" race
    condition is possible.
    """
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    resource_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), nullable=False)
    booked_by: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    status: Mapped[BookingStatusEnum] = mapped_column(
        SAEnum(BookingStatusEnum), default=BookingStatusEnum.UPCOMING, nullable=False
    )
    start_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
