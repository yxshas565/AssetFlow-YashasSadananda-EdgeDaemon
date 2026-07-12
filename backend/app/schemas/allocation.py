from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TransferStatusEnum


# ---------- Allocation ----------

class AllocationCreate(BaseModel):
    asset_id: int
    employee_id: int | None = None
    department_id: int | None = None
    expected_return_date: date | None = None
    condition_notes: str | None = Field(default=None, max_length=1000)


class AllocationReturn(BaseModel):
    condition_notes: str | None = Field(default=None, max_length=1000)


class AllocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_id: int
    employee_id: int | None
    department_id: int | None
    allocated_at: datetime
    expected_return_date: date | None
    returned_at: datetime | None
    condition_notes: str | None


class AllocationListOut(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[AllocationOut]


# ---------- Transfer ----------

class TransferCreate(BaseModel):
    asset_id: int
    to_employee_id: int


class TransferOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_id: int
    from_employee_id: int | None
    to_employee_id: int
    status: TransferStatusEnum
    requested_at: datetime
    approved_by: int | None
    approved_at: datetime | None


class TransferListOut(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[TransferOut]