from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import MaintenanceStatusEnum


class MaintenanceCreate(BaseModel):
    asset_id: int
    issue_description: str = Field(min_length=1, max_length=2000)
    priority: str = Field(default="Medium", pattern="^(Low|Medium|High|Critical)$")


class TechnicianAssign(BaseModel):
    technician_name: str = Field(min_length=1, max_length=150)


class MaintenanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_id: int
    raised_by: int
    issue_description: str
    priority: str
    status: MaintenanceStatusEnum
    approved_by: int | None
    technician_name: str | None
    created_at: datetime
    resolved_at: datetime | None


class MaintenanceListOut(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[MaintenanceOut]