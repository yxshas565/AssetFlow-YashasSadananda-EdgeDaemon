from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AuditCycleStatusEnum, DiscrepancyTypeEnum, AssetStatusEnum


class AuditCycleCreate(BaseModel):
    scope_department_id: int | None = None
    scope_location: str | None = Field(default=None, max_length=150)
    start_date: date
    end_date: date

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, end_date, info):
        start_date = info.data.get("start_date")
        if start_date is not None and end_date < start_date:
            raise ValueError("end_date must be on or after start_date")
        return end_date


class AuditCycleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scope_department_id: int | None
    scope_location: str | None
    start_date: date
    end_date: date
    status: AuditCycleStatusEnum
    created_at: datetime


class AuditorAssign(BaseModel):
    employee_id: int


class FindingCreate(BaseModel):
    asset_id: int
    observed_status: AssetStatusEnum


class FindingResolve(BaseModel):
    resolution_note: str = Field(min_length=1, max_length=1000)


class FindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    audit_cycle_id: int
    asset_id: int
    expected_status: str
    observed_status: str
    discrepancy_type: DiscrepancyTypeEnum | None
    resolved: bool
    resolution_note: str | None
    created_at: datetime