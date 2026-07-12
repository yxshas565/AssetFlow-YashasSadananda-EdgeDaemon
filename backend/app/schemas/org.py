from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import RoleEnum


# ---------- Department ----------

class DepartmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    parent_department_id: int | None = None
    head_employee_id: int | None = None


class DepartmentUpdate(BaseModel):
    # All optional -> PATCH semantics (partial update). None means "not provided",
    # not "clear the field" — we only touch fields explicitly sent by the client.
    name: str | None = Field(default=None, min_length=1, max_length=120)
    parent_department_id: int | None = None
    head_employee_id: int | None = None
    is_active: bool | None = None


class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    parent_department_id: int | None
    head_employee_id: int | None
    is_active: bool


# ---------- Asset Category ----------

class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    is_active: bool | None = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_active: bool


# ---------- Employee directory ----------

class EmployeeDirectoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: RoleEnum
    department_id: int | None
    is_active: bool


class RolePromoteRequest(BaseModel):
    role: RoleEnum