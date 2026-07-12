from pydantic import BaseModel, EmailStr, ConfigDict

from app.models.enums import RoleEnum


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    department_id: int | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class EmployeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: RoleEnum
    department_id: int | None
    is_active: bool
