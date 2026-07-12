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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    # Stubbed "email delivery": in a real deployment this token would be
    # emailed, never returned in the API response. Returned here only so
    # the frontend can display it for demo purposes — explicitly a
    # deferred scope item, not a security oversight.
    reset_token: str
    expires_in_minutes: int


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str