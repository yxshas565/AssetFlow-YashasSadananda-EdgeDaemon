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
