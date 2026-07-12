from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.maintenance import MaintenanceRequest
from app.models.asset import Asset, AssetStatusHistory
from app.models.org import Employee
from app.models.enums import MaintenanceStatusEnum, AssetStatusEnum, RoleEnum
from app.schemas.maintenance import (
    MaintenanceCreate, TechnicianAssign, MaintenanceOut, MaintenanceListOut,
)

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

MANAGE_ROLES = require_roles(RoleEnum.ADMIN, RoleEnum.ASSET_MANAGER)


@router.post("", response_model=MaintenanceOut, status_code=status.HTTP_201_CREATED)
def raise_request(payload: MaintenanceCreate, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    asset = db.get(Asset, payload.asset_id)
    if asset is None:
        raise HTTPException(404, "Asset not found")
    if asset.status in (AssetStatusEnum.RETIRED, AssetStatusEnum.DISPOSED):
        raise HTTPException(400, f"Cannot raise maintenance for a {asset.status.value} asset")

    request = MaintenanceRequest(
        asset_id=payload.asset_id,
        raised_by=current_user.id,
        issue_description=payload.issue_description,
        priority=payload.priority,
        status=MaintenanceStatusEnum.PENDING,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


@router.get("", response_model=MaintenanceListOut)
def list_requests(
    asset_id: int | None = None,
    status_filter: MaintenanceStatusEnum | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    if limit < 1 or limit > 200:
        raise HTTPException(400, "limit must be between 1 and 200")
    if offset < 0:
        raise HTTPException(400, "offset must be >= 0")

    query = db.query(MaintenanceRequest)
    if asset_id is not None:
        query = query.filter(MaintenanceRequest.asset_id == asset_id)
    if status_filter is not None:
        query = query.filter(MaintenanceRequest.status == status_filter)

    total = query.count()
    items = query.order_by(MaintenanceRequest.created_at.desc()).limit(limit).offset(offset).all()
    return MaintenanceListOut(total=total, limit=limit, offset=offset, items=items)


@router.get("/{request_id}", response_model=MaintenanceOut)
def get_request(request_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    request = db.get(MaintenanceRequest, request_id)
    if request is None:
        raise HTTPException(404, "Maintenance request not found")
    return request


def _require_status(request: MaintenanceRequest, expected: MaintenanceStatusEnum):
    if request.status != expected:
        raise HTTPException(400, f"Request must be in '{expected.value}' state (current: '{request.status.value}')")


@router.patch("/{request_id}/approve", response_model=MaintenanceOut, dependencies=[Depends(MANAGE_ROLES)])
def approve_request(request_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    request = db.get(MaintenanceRequest, request_id)
    if request is None:
        raise HTTPException(404, "Maintenance request not found")
    _require_status(request, MaintenanceStatusEnum.PENDING)

    request.status = MaintenanceStatusEnum.APPROVED
    request.approved_by = current_user.id

    asset = db.get(Asset, request.asset_id)
    db.add(AssetStatusHistory(
        asset_id=asset.id, from_status=asset.status.value, to_status=AssetStatusEnum.UNDER_MAINTENANCE.value,
        changed_by=current_user.id, reason=f"Maintenance request #{request.id} approved",
    ))
    asset.status = AssetStatusEnum.UNDER_MAINTENANCE

    db.commit()
    db.refresh(request)
    return request


@router.patch("/{request_id}/reject", response_model=MaintenanceOut, dependencies=[Depends(MANAGE_ROLES)])
def reject_request(request_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    request = db.get(MaintenanceRequest, request_id)
    if request is None:
        raise HTTPException(404, "Maintenance request not found")
    _require_status(request, MaintenanceStatusEnum.PENDING)

    request.status = MaintenanceStatusEnum.REJECTED
    request.approved_by = current_user.id
    db.commit()
    db.refresh(request)
    return request


@router.patch("/{request_id}/assign-technician", response_model=MaintenanceOut, dependencies=[Depends(MANAGE_ROLES)])
def assign_technician(request_id: int, payload: TechnicianAssign, db: Session = Depends(get_db)):
    request = db.get(MaintenanceRequest, request_id)
    if request is None:
        raise HTTPException(404, "Maintenance request not found")
    _require_status(request, MaintenanceStatusEnum.APPROVED)

    request.technician_name = payload.technician_name
    request.status = MaintenanceStatusEnum.TECHNICIAN_ASSIGNED
    db.commit()
    db.refresh(request)
    return request


@router.patch("/{request_id}/start", response_model=MaintenanceOut, dependencies=[Depends(MANAGE_ROLES)])
def start_work(request_id: int, db: Session = Depends(get_db)):
    request = db.get(MaintenanceRequest, request_id)
    if request is None:
        raise HTTPException(404, "Maintenance request not found")
    _require_status(request, MaintenanceStatusEnum.TECHNICIAN_ASSIGNED)

    request.status = MaintenanceStatusEnum.IN_PROGRESS
    db.commit()
    db.refresh(request)
    return request


@router.patch("/{request_id}/resolve", response_model=MaintenanceOut, dependencies=[Depends(MANAGE_ROLES)])
def resolve_request(request_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    request = db.get(MaintenanceRequest, request_id)
    if request is None:
        raise HTTPException(404, "Maintenance request not found")
    _require_status(request, MaintenanceStatusEnum.IN_PROGRESS)

    request.status = MaintenanceStatusEnum.RESOLVED
    request.resolved_at = datetime.now(timezone.utc)

    asset = db.get(Asset, request.asset_id)
    db.add(AssetStatusHistory(
        asset_id=asset.id, from_status=asset.status.value, to_status=AssetStatusEnum.AVAILABLE.value,
        changed_by=current_user.id, reason=f"Maintenance request #{request.id} resolved",
    ))
    asset.status = AssetStatusEnum.AVAILABLE

    db.commit()
    db.refresh(request)
    return request