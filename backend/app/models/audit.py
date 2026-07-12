from datetime import date, datetime, timezone

from sqlalchemy import String, ForeignKey, DateTime, Date, Boolean, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import AuditCycleStatusEnum, DiscrepancyTypeEnum


class AuditCycle(Base):
    __tablename__ = "audit_cycles"

    id: Mapped[int] = mapped_column(primary_key=True)
    scope_department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    scope_location: Mapped[str | None] = mapped_column(String(150), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[AuditCycleStatusEnum] = mapped_column(
        SAEnum(AuditCycleStatusEnum), default=AuditCycleStatusEnum.SCHEDULED, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AuditCycleAuditor(Base):
    """Join table — many auditors can be assigned to one audit cycle."""
    __tablename__ = "audit_cycle_auditors"

    id: Mapped[int] = mapped_column(primary_key=True)
    audit_cycle_id: Mapped[int] = mapped_column(ForeignKey("audit_cycles.id"), nullable=False)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)


class AuditFinding(Base):
    """
    Core discrepancy-detection table: compares expected_status (from the
    live assets table at scan time) against observed_status (what the
    auditor actually recorded). A mismatch auto-generates a row here with
    a discrepancy_type. Closing the audit cycle walks unresolved findings
    and updates the underlying asset status (e.g. confirmed-missing -> Lost).
    """
    __tablename__ = "audit_findings"

    id: Mapped[int] = mapped_column(primary_key=True)
    audit_cycle_id: Mapped[int] = mapped_column(ForeignKey("audit_cycles.id"), nullable=False)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), nullable=False)
    expected_status: Mapped[str] = mapped_column(String(30), nullable=False)
    observed_status: Mapped[str] = mapped_column(String(30), nullable=False)
    discrepancy_type: Mapped[DiscrepancyTypeEnum | None] = mapped_column(
        SAEnum(DiscrepancyTypeEnum), nullable=True
    )
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
