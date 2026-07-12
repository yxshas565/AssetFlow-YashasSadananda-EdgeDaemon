from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import String, ForeignKey, DateTime, Date, Numeric, Boolean, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import AssetStatusEnum


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_tag: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)  # e.g. AF-0001
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("asset_categories.id"), nullable=False)
    serial_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    acquisition_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    acquisition_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    condition: Mapped[str | None] = mapped_column(String(50), nullable=True)
    location: Mapped[str | None] = mapped_column(String(150), nullable=True)
    status: Mapped[AssetStatusEnum] = mapped_column(
        SAEnum(AssetStatusEnum), default=AssetStatusEnum.AVAILABLE, nullable=False
    )
    is_bookable: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    category: Mapped["AssetCategory"] = relationship("AssetCategory")


class AssetStatusHistory(Base):
    """
    Append-only audit trail. Every state-changing action across the system
    (allocation, transfer, maintenance, audit closure) writes a row here.
    This is the backbone for per-asset history (Screen 4) and the
    Activity Log screen, without needing full event sourcing.
    """
    __tablename__ = "asset_status_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), nullable=False)
    from_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
