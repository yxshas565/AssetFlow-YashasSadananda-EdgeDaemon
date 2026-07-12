from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.asset import Asset, AssetStatusHistory
from app.models.org import AssetCategory, Employee
from app.models.enums import AssetStatusEnum, RoleEnum
from app.schemas.asset import (
    AssetCreate, AssetUpdate, AssetOut, AssetStatusChange, AssetStatusHistoryOut,
)
from app.schemas.asset import (
    AssetCreate, AssetUpdate, AssetOut, AssetStatusChange, AssetStatusHistoryOut, AssetListOut,
)

router = APIRouter(prefix="/assets", tags=["assets"])

WRITE_ROLES = require_roles(RoleEnum.ADMIN, RoleEnum.ASSET_MANAGER)


@router.post("", response_model=AssetOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(WRITE_ROLES)])
def create_asset(payload: AssetCreate, db: Session = Depends(get_db)):
    category = db.get(AssetCategory, payload.category_id)
    if category is None or not category.is_active:
        raise HTTPException(400, "category_id does not reference an active category")

    asset = Asset(**payload.model_dump())
    db.add(asset)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An asset with this asset_tag already exists")
    db.refresh(asset)

    # Seed the history trail: first row has no from_status, marks initial registration.
    db.add(AssetStatusHistory(asset_id=asset.id, from_status=None, to_status=asset.status.value))
    db.commit()

    return asset


@router.get("", response_model=AssetListOut)
def list_assets(
    status_filter: AssetStatusEnum | None = None,
    category_id: int | None = None,
    is_bookable: bool | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    if limit < 1 or limit > 200:
        raise HTTPException(400, "limit must be between 1 and 200")
    if offset < 0:
        raise HTTPException(400, "offset must be >= 0")

    query = db.query(Asset)
    if status_filter is not None:
        query = query.filter(Asset.status == status_filter)
    if category_id is not None:
        query = query.filter(Asset.category_id == category_id)
    if is_bookable is not None:
        query = query.filter(Asset.is_bookable == is_bookable)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(Asset.name.ilike(pattern), Asset.asset_tag.ilike(pattern), Asset.serial_number.ilike(pattern))
        )

    total = query.count()
    items = query.order_by(Asset.asset_tag).limit(limit).offset(offset).all()

    return AssetListOut(total=total, limit=limit, offset=offset, items=items)


@router.get("/{asset_id}", response_model=AssetOut)
def get_asset(asset_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    asset = db.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(404, "Asset not found")
    return asset


@router.get("/{asset_id}/history", response_model=list[AssetStatusHistoryOut])
def get_asset_history(asset_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    asset = db.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(404, "Asset not found")
    return (
        db.query(AssetStatusHistory)
        .filter(AssetStatusHistory.asset_id == asset_id)
        .order_by(AssetStatusHistory.changed_at.desc())
        .all()
    )


@router.patch("/{asset_id}", response_model=AssetOut, dependencies=[Depends(WRITE_ROLES)])
def update_asset(asset_id: int, payload: AssetUpdate, db: Session = Depends(get_db)):
    asset = db.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(404, "Asset not found")

    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data:
        category = db.get(AssetCategory, data["category_id"])
        if category is None or not category.is_active:
            raise HTTPException(400, "category_id does not reference an active category")

    for field, value in data.items():
        setattr(asset, field, value)

    db.commit()
    db.refresh(asset)
    return asset


@router.patch("/{asset_id}/status", response_model=AssetOut, dependencies=[Depends(WRITE_ROLES)])
def change_asset_status(
    asset_id: int,
    payload: AssetStatusChange,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Single choke point for every status transition. Anything that changes
    Asset.status — allocation, return, maintenance, audit closure — should
    call through here (directly or by reusing this pattern), so
    AssetStatusHistory never falls out of sync with the live status.
    """
    asset = db.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(404, "Asset not found")

    if asset.status == payload.status:
        raise HTTPException(400, f"Asset is already in status '{payload.status.value}'")

    old_status = asset.status.value
    asset.status = payload.status
    db.add(AssetStatusHistory(
        asset_id=asset.id,
        from_status=old_status,
        to_status=payload.status.value,
        changed_by=current_user.id,
        reason=payload.reason,
    ))
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(WRITE_ROLES)])
def retire_asset(asset_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    # Never a real DELETE — assets are referenced by allocations/bookings/history.
    # "Deleting" an asset means retiring it; history is preserved.
    asset = db.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(404, "Asset not found")
    if asset.status == AssetStatusEnum.RETIRED:
        raise HTTPException(400, "Asset is already retired")

    old_status = asset.status.value
    asset.status = AssetStatusEnum.RETIRED
    db.add(AssetStatusHistory(
        asset_id=asset.id, from_status=old_status, to_status=AssetStatusEnum.RETIRED.value,
        changed_by=current_user.id, reason="Retired via delete endpoint",
    ))
    db.commit()