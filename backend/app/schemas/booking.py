from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import BookingStatusEnum


class BookingCreate(BaseModel):
    resource_id: int
    start_ts: datetime
    end_ts: datetime

    @field_validator("end_ts")
    @classmethod
    def end_after_start(cls, end_ts, info):
        start_ts = info.data.get("start_ts")
        if start_ts is not None and end_ts <= start_ts:
            raise ValueError("end_ts must be after start_ts")
        return end_ts


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    resource_id: int
    booked_by: int
    status: BookingStatusEnum
    start_ts: datetime
    end_ts: datetime
    created_at: datetime


class BookingListOut(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[BookingOut]