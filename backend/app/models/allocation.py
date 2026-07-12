from datetime import date, datetime, timezone

from sqlalchemy import String, ForeignKey, DateTime, Date, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import TransferStatusEnum


class Allocation(Base):
    """
    Historical + current allocation rows. returned_at IS NULL means this
    is the currently active allocation for the asset. The service layer
    enforces at most one active (returned_at IS NULL) allocation per asset —
    this is the double-allocation guard.
    """
    __tablename__ = "allocations"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), nullable=False)
    employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    allocated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expected_return_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    condition_notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class TransferRequest(Base):
    __tablename__ = "transfer_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), nullable=False)
    from_employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    to_employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    status: Mapped[TransferStatusEnum] = mapped_column(
        SAEnum(TransferStatusEnum), default=TransferStatusEnum.REQUESTED, nullable=False
    )
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
