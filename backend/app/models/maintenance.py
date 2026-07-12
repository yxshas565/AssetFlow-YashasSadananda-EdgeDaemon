from datetime import datetime, timezone

from sqlalchemy import String, ForeignKey, DateTime, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import MaintenanceStatusEnum


class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), nullable=False)
    raised_by: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    issue_description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="Medium")
    status: Mapped[MaintenanceStatusEnum] = mapped_column(
        SAEnum(MaintenanceStatusEnum), default=MaintenanceStatusEnum.PENDING, nullable=False
    )
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    technician_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
