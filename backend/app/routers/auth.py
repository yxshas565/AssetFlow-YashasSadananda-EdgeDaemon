from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user
from app.models.org import Employee
from app.models.enums import RoleEnum
from app.schemas.auth import SignupRequest, LoginRequest, TokenResponse, EmployeeOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    """
    Creates an Employee-role account ONLY. There is no role field on this
    request schema and no code path here that accepts one — role escalation
    to DepartmentHead / AssetManager / Admin happens exclusively through the
    Admin-only Organization Setup > Employee Directory screen (see
    app/routers/org.py, promote_employee). This is a deliberate business
    rule from the problem statement, not an oversight.
    """
    existing = db.query(Employee).filter(Employee.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    employee = Employee(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        department_id=payload.department_id,
        role=RoleEnum.EMPLOYEE,  # hardcoded, not read from client input
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Standard OAuth2 password-flow login. Uses OAuth2PasswordRequestForm
    (form-encoded username/password) rather than a JSON body so the
    auto-generated /docs "Authorize" button works out of the box for
    manual testing/demo purposes. `username` field carries the email.
    """
    user = db.query(Employee).filter(Employee.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    token = create_access_token(subject=user.email, role=user.role.value)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=EmployeeOut)
def read_current_user(current_user: Employee = Depends(get_current_user)):
    return current_user


import secrets
import hashlib
from datetime import datetime, timedelta, timezone

from app.models.auth import PasswordResetToken
from app.schemas.auth import ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest

RESET_TOKEN_EXPIRE_MINUTES = 30


def _hash_token(raw_token: str) -> str:
    # SHA-256 is fine here (not bcrypt) — this is a random 32-byte token,
    # not a human password, so there's no brute-force-by-guessing risk to
    # defend against with slow hashing; we just don't want it sitting in
    # the DB in plaintext.
    return hashlib.sha256(raw_token.encode()).hexdigest()


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(Employee).filter(Employee.email == payload.email).first()

    # Deliberately do NOT reveal whether the email exists — always return
    # a token-shaped response. Otherwise this endpoint becomes a way to
    # enumerate registered emails (a real security issue).
    if not user:
        fake_token = secrets.token_urlsafe(32)
        return ForgotPasswordResponse(reset_token=fake_token, expires_in_minutes=RESET_TOKEN_EXPIRE_MINUTES)

    raw_token = secrets.token_urlsafe(32)
    reset_row = PasswordResetToken(
        employee_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES),
        used=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(reset_row)
    db.commit()

    return ForgotPasswordResponse(reset_token=raw_token, expires_in_minutes=RESET_TOKEN_EXPIRE_MINUTES)


@router.post("/reset-password", response_model=EmployeeOut)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = _hash_token(payload.token)
    reset_row = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash)
        .first()
    )

    if not reset_row:
        raise HTTPException(400, "Invalid or expired reset token")
    if reset_row.used:
        raise HTTPException(400, "This reset token has already been used")
    if reset_row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(400, "This reset token has expired")

    user = db.get(Employee, reset_row.employee_id)
    if not user:
        raise HTTPException(400, "Invalid or expired reset token")

    user.hashed_password = hash_password(payload.new_password)
    reset_row.used = True
    db.commit()
    db.refresh(user)
    return user