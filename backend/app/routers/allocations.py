from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.allocation import Allocation, TransferRequest
from app.models.asset import Asset, AssetStatusHistory
from app.models.org import Employee, Department
from app.models.enums import AssetStatusEnum, TransferStatusEnum, RoleEnum
from app.schemas.allocation import (
    AllocationCreate, AllocationReturn, AllocationOut, AllocationListOut,
    TransferCreate, TransferOut, TransferListOut,
)

router = APIRouter(tags=["allocations"])

MANAGE_ROLES = require_roles(RoleEnum.ADMIN, RoleEnum.ASSET_MANAGER)


def _record_status_change(db: Session, asset: Asset, new_status: AssetStatusEnum, changed_by: int, reason: str):
    old_status = asset.status.value
    asset.status = new_status
    db.add(AssetStatusHistory(
        asset_id=asset.id, from_status=old_status, to_status=new_status.value,
        changed_by=changed_by, reason=reason,
    ))


# ============================================================
# Allocations
# ============================================================

@router.post("/allocations", response_model=AllocationOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(MANAGE_ROLES)])
def allocate_asset(payload: AllocationCreate, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    if payload.employee_id is None and payload.department_id is None:
        raise HTTPException(400, "Must specify either employee_id or department_id")

    asset = db.get(Asset, payload.asset_id)
    if asset is None:
        raise HTTPException(404, "Asset not found")
    if asset.status != AssetStatusEnum.AVAILABLE:
        raise HTTPException(400, f"Asset is not available (current status: {asset.status.value})")

    if payload.employee_id is not None:
        employee = db.get(Employee, payload.employee_id)
        if employee is None or not employee.is_active:
            raise HTTPException(400, "employee_id does not reference an active employee")

    if payload.department_id is not None:
        department = db.get(Department, payload.department_id)
        if department is None or not department.is_active:
            raise HTTPException(400, "department_id does not reference an active department")

    # Guard against double-allocation. No DB constraint enforces this (unlike
    # bookings' EXCLUDE constraint), so it's checked here before insert.
    active = (
        db.query(Allocation)
        .filter(Allocation.asset_id == payload.asset_id, Allocation.returned_at.is_(None))
        .first()
    )
    if active is not None:
        raise HTTPException(409, "Asset already has an active allocation")

    allocation = Allocation(
        asset_id=payload.asset_id,
        employee_id=payload.employee_id,
        department_id=payload.department_id,
        expected_return_date=payload.expected_return_date,
        condition_notes=payload.condition_notes,
    )
    db.add(allocation)
    _record_status_change(db, asset, AssetStatusEnum.ALLOCATED, current_user.id, "Allocated")
    db.commit()
    db.refresh(allocation)
    return allocation


@router.post("/allocations/{allocation_id}/return", response_model=AllocationOut, dependencies=[Depends(MANAGE_ROLES)])
def return_asset(allocation_id: int, payload: AllocationReturn, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    allocation = db.get(Allocation, allocation_id)
    if allocation is None:
        raise HTTPException(404, "Allocation not found")
    if allocation.returned_at is not None:
        raise HTTPException(400, "This allocation has already been returned")

    asset = db.get(Asset, allocation.asset_id)
    allocation.returned_at = datetime.now(timezone.utc)
    if payload.condition_notes:
        allocation.condition_notes = payload.condition_notes

    _record_status_change(db, asset, AssetStatusEnum.AVAILABLE, current_user.id, "Returned")
    db.commit()
    db.refresh(allocation)
    return allocation


@router.get("/allocations", response_model=AllocationListOut)
def list_allocations(
    asset_id: int | None = None,
    employee_id: int | None = None,
    active_only: bool | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    if limit < 1 or limit > 200:
        raise HTTPException(400, "limit must be between 1 and 200")
    if offset < 0:
        raise HTTPException(400, "offset must be >= 0")

    query = db.query(Allocation)
    if asset_id is not None:
        query = query.filter(Allocation.asset_id == asset_id)
    if employee_id is not None:
        query = query.filter(Allocation.employee_id == employee_id)
    if active_only is True:
        query = query.filter(Allocation.returned_at.is_(None))
    elif active_only is False:
        query = query.filter(Allocation.returned_at.isnot(None))

    total = query.count()
    items = query.order_by(Allocation.allocated_at.desc()).limit(limit).offset(offset).all()
    return AllocationListOut(total=total, limit=limit, offset=offset, items=items)


@router.get("/allocations/{allocation_id}", response_model=AllocationOut)
def get_allocation(allocation_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    allocation = db.get(Allocation, allocation_id)
    if allocation is None:
        raise HTTPException(404, "Allocation not found")
    return allocation


# ============================================================
# Transfers
# ============================================================

@router.post("/transfers", response_model=TransferOut, status_code=status.HTTP_201_CREATED)
def request_transfer(payload: TransferCreate, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    asset = db.get(Asset, payload.asset_id)
    if asset is None:
        raise HTTPException(404, "Asset not found")

    active_allocation = (
        db.query(Allocation)
        .filter(Allocation.asset_id == payload.asset_id, Allocation.returned_at.is_(None))
        .first()
    )
    if active_allocation is None:
        raise HTTPException(400, "Asset has no active allocation to transfer")
    if active_allocation.employee_id != current_user.id:
        raise HTTPException(403, "You can only request transfer of assets currently allocated to you")

    to_employee = db.get(Employee, payload.to_employee_id)
    if to_employee is None or not to_employee.is_active:
        raise HTTPException(400, "to_employee_id does not reference an active employee")
    if payload.to_employee_id == current_user.id:
        raise HTTPException(400, "Cannot transfer an asset to yourself")

    transfer = TransferRequest(
        asset_id=payload.asset_id,
        from_employee_id=current_user.id,
        to_employee_id=payload.to_employee_id,
        status=TransferStatusEnum.REQUESTED,
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    return transfer


@router.patch("/transfers/{transfer_id}/approve", response_model=TransferOut, dependencies=[Depends(MANAGE_ROLES)])
def approve_transfer(transfer_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    transfer = db.get(TransferRequest, transfer_id)
    if transfer is None:
        raise HTTPException(404, "Transfer request not found")
    if transfer.status != TransferStatusEnum.REQUESTED:
        raise HTTPException(400, f"Transfer is not in Requested state (current: {transfer.status.value})")

    # Close the old allocation and open a new one atomically in the same
    # transaction — asset status never passes through "Available" in
    # between, so it can't be allocated to a third party mid-transfer.
    old_allocation = (
        db.query(Allocation)
        .filter(Allocation.asset_id == transfer.asset_id, Allocation.returned_at.is_(None))
        .first()
    )
    if old_allocation is None:
        raise HTTPException(409, "No active allocation found for this asset; cannot complete transfer")

    old_allocation.returned_at = datetime.now(timezone.utc)

    new_allocation = Allocation(
        asset_id=transfer.asset_id,
        employee_id=transfer.to_employee_id,
        allocated_at=datetime.now(timezone.utc),
    )
    db.add(new_allocation)

    transfer.status = TransferStatusEnum.COMPLETED
    transfer.approved_by = current_user.id
    transfer.approved_at = datetime.now(timezone.utc)

    asset = db.get(Asset, transfer.asset_id)
    db.add(AssetStatusHistory(
        asset_id=asset.id, from_status=asset.status.value, to_status=AssetStatusEnum.ALLOCATED.value,
        changed_by=current_user.id, reason=f"Transfer completed: {transfer.from_employee_id} -> {transfer.to_employee_id}",
    ))
    # status stays ALLOCATED throughout; history row still records the event for audit purposes

    db.commit()
    db.refresh(transfer)
    return transfer


@router.patch("/transfers/{transfer_id}/reject", response_model=TransferOut, dependencies=[Depends(MANAGE_ROLES)])
def reject_transfer(transfer_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    transfer = db.get(TransferRequest, transfer_id)
    if transfer is None:
        raise HTTPException(404, "Transfer request not found")
    if transfer.status != TransferStatusEnum.REQUESTED:
        raise HTTPException(400, f"Transfer is not in Requested state (current: {transfer.status.value})")

    transfer.status = TransferStatusEnum.REJECTED
    transfer.approved_by = current_user.id
    transfer.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(transfer)
    return transfer


@router.get("/transfers", response_model=TransferListOut)
def list_transfers(
    asset_id: int | None = None,
    status_filter: TransferStatusEnum | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    if limit < 1 or limit > 200:
        raise HTTPException(400, "limit must be between 1 and 200")
    if offset < 0:
        raise HTTPException(400, "offset must be >= 0")

    query = db.query(TransferRequest)
    if asset_id is not None:
        query = query.filter(TransferRequest.asset_id == asset_id)
    if status_filter is not None:
        query = query.filter(TransferRequest.status == status_filter)

    total = query.count()
    items = query.order_by(TransferRequest.requested_at.desc()).limit(limit).offset(offset).all()
    return TransferListOut(total=total, limit=limit, offset=offset, items=items)