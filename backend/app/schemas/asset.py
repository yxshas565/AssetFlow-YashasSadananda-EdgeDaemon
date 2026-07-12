from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AssetStatusEnum


class AssetCreate(BaseModel):
    asset_tag: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=150)
    category_id: int
    serial_number: str | None = Field(default=None, max_length=100)
    acquisition_date: date | None = None
    acquisition_cost: Decimal | None = Field(default=None, ge=0)
    condition: str | None = Field(default=None, max_length=50)
    location: str | None = Field(default=None, max_length=150)
    is_bookable: bool = False


class AssetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    category_id: int | None = None
    serial_number: str | None = Field(default=None, max_length=100)
    acquisition_date: date | None = None
    acquisition_cost: Decimal | None = Field(default=None, ge=0)
    condition: str | None = Field(default=None, max_length=50)
    location: str | None = Field(default=None, max_length=150)
    is_bookable: bool | None = None


class AssetStatusChange(BaseModel):
    status: AssetStatusEnum
    reason: str | None = Field(default=None, max_length=500)


class AssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_tag: str
    name: str
    category_id: int
    serial_number: str | None
    acquisition_date: date | None
    acquisition_cost: Decimal | None
    condition: str | None
    location: str | None
    status: AssetStatusEnum
    is_bookable: bool


class AssetStatusHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_status: str | None
    to_status: str
    changed_by: int | None
    reason: str | None


class AssetListOut(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[AssetOut]