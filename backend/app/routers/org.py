from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.org import Department, AssetCategory, Employee
from app.models.enums import RoleEnum
from app.schemas.org import (
    DepartmentCreate, DepartmentUpdate, DepartmentOut,
    CategoryCreate, CategoryUpdate, CategoryOut,
    EmployeeDirectoryOut, RolePromoteRequest,
)

router = APIRouter(prefix="/org", tags=["organization"])


# ============================================================
# Departments
# ============================================================

@router.post(
    "/departments",
    response_model=DepartmentOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(RoleEnum.ADMIN))],
)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db)):
    if payload.parent_department_id is not None:
        parent = db.get(Department, payload.parent_department_id)
        if parent is None or not parent.is_active:
            raise HTTPException(400, "parent_department_id does not reference an active department")

    if payload.head_employee_id is not None:
        head = db.get(Employee, payload.head_employee_id)
        if head is None or not head.is_active:
            raise HTTPException(400, "head_employee_id does not reference an active employee")

    dept = Department(**payload.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    query = db.query(Department)
    if is_active is not None:
        query = query.filter(Department.is_active == is_active)
    return query.order_by(Department.name).all()


@router.get("/departments/{department_id}", response_model=DepartmentOut)
def get_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    dept = db.get(Department, department_id)
    if dept is None:
        raise HTTPException(404, "Department not found")
    return dept


@router.patch(
    "/departments/{department_id}",
    response_model=DepartmentOut,
    dependencies=[Depends(require_roles(RoleEnum.ADMIN))],
)
def update_department(department_id: int, payload: DepartmentUpdate, db: Session = Depends(get_db)):
    dept = db.get(Department, department_id)
    if dept is None:
        raise HTTPException(404, "Department not found")

    data = payload.model_dump(exclude_unset=True)  # only fields the client actually sent

    if "parent_department_id" in data and data["parent_department_id"] is not None:
        if data["parent_department_id"] == department_id:
            raise HTTPException(400, "A department cannot be its own parent")
        parent = db.get(Department, data["parent_department_id"])
        if parent is None or not parent.is_active:
            raise HTTPException(400, "parent_department_id does not reference an active department")

    if "head_employee_id" in data and data["head_employee_id"] is not None:
        head = db.get(Employee, data["head_employee_id"])
        if head is None or not head.is_active:
            raise HTTPException(400, "head_employee_id does not reference an active employee")

    for field, value in data.items():
        setattr(dept, field, value)

    db.commit()
    db.refresh(dept)
    return dept


@router.delete(
    "/departments/{department_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles(RoleEnum.ADMIN))],
)
def deactivate_department(department_id: int, db: Session = Depends(get_db)):
    # Soft delete only. Employees/assets may reference this department_id (FK),
    # so a hard DELETE would either fail on the FK constraint or orphan rows.
    dept = db.get(Department, department_id)
    if dept is None:
        raise HTTPException(404, "Department not found")
    dept.is_active = False
    db.commit()


# ============================================================
# Asset Categories
# ============================================================

@router.post(
    "/categories",
    response_model=CategoryOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(RoleEnum.ADMIN))],
)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    category = AssetCategory(**payload.model_dump())
    db.add(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A category with this name already exists")
    db.refresh(category)
    return category


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    query = db.query(AssetCategory)
    if is_active is not None:
        query = query.filter(AssetCategory.is_active == is_active)
    return query.order_by(AssetCategory.name).all()


@router.patch(
    "/categories/{category_id}",
    response_model=CategoryOut,
    dependencies=[Depends(require_roles(RoleEnum.ADMIN))],
)
def update_category(category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db)):
    category = db.get(AssetCategory, category_id)
    if category is None:
        raise HTTPException(404, "Category not found")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(category, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A category with this name already exists")
    db.refresh(category)
    return category


@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles(RoleEnum.ADMIN))],
)
def deactivate_category(category_id: int, db: Session = Depends(get_db)):
    category = db.get(AssetCategory, category_id)
    if category is None:
        raise HTTPException(404, "Category not found")
    category.is_active = False
    db.commit()


# ============================================================
# Employee Directory
# ============================================================

@router.get("/employees", response_model=list[EmployeeDirectoryOut])
def list_employees(
    department_id: int | None = None,
    role: RoleEnum | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    query = db.query(Employee)
    if department_id is not None:
        query = query.filter(Employee.department_id == department_id)
    if role is not None:
        query = query.filter(Employee.role == role)
    if is_active is not None:
        query = query.filter(Employee.is_active == is_active)
    return query.order_by(Employee.name).all()


@router.get("/employees/{employee_id}", response_model=EmployeeDirectoryOut)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(404, "Employee not found")
    return employee


@router.patch(
    "/employees/{employee_id}/role",
    response_model=EmployeeDirectoryOut,
    dependencies=[Depends(require_roles(RoleEnum.ADMIN))],
)
def promote_employee(
    employee_id: int,
    payload: RolePromoteRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # No self-elevation/self-demotion path — forces role changes to go
    # through a second admin, avoiding an admin accidentally locking
    # themselves out or silently self-promoting.
    if employee_id == current_user.id:
        raise HTTPException(400, "Admins cannot change their own role")

    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(404, "Employee not found")

    employee.role = payload.role
    db.commit()
    db.refresh(employee)
    return employee