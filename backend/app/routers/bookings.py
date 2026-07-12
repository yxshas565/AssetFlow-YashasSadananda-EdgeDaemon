from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.booking import Booking
from app.models.asset import Asset
from app.models.org import Employee
from app.models.enums import BookingStatusEnum, RoleEnum
from app.schemas.booking import BookingCreate, BookingOut, BookingListOut

router = APIRouter(prefix="/bookings", tags=["bookings"])

MANAGE_ROLES = (RoleEnum.ADMIN, RoleEnum.ASSET_MANAGER)


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    asset = db.get(Asset, payload.resource_id)
    if asset is None:
        raise HTTPException(404, "Asset not found")
    if not asset.is_bookable:
        raise HTTPException(400, "This asset is not bookable")

    if payload.start_ts < datetime.now(timezone.utc):
        raise HTTPException(400, "start_ts cannot be in the past")

    booking = Booking(
        resource_id=payload.resource_id,
        booked_by=current_user.id,
        start_ts=payload.start_ts,
        end_ts=payload.end_ts,
        status=BookingStatusEnum.UPCOMING,
    )
    db.add(booking)
    try:
        db.commit()
    except IntegrityError:
        # This is the EXCLUDE constraint firing (bookings_no_overlap). No
        # application-level "check then insert" race is possible — Postgres
        # itself rejects the second overlapping INSERT, even under
        # concurrent requests. We just translate that DB-level rejection
        # into a clean 409 instead of a raw 500.
        db.rollback()
        raise HTTPException(409, "This asset is already booked for an overlapping time window")

    db.refresh(booking)
    return booking


@router.get("", response_model=BookingListOut)
def list_bookings(
    resource_id: int | None = None,
    booked_by: int | None = None,
    status_filter: BookingStatusEnum | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    if limit < 1 or limit > 200:
        raise HTTPException(400, "limit must be between 1 and 200")
    if offset < 0:
        raise HTTPException(400, "offset must be >= 0")

    query = db.query(Booking)
    if resource_id is not None:
        query = query.filter(Booking.resource_id == resource_id)
    if booked_by is not None:
        query = query.filter(Booking.booked_by == booked_by)
    if status_filter is not None:
        query = query.filter(Booking.status == status_filter)

    total = query.count()
    items = query.order_by(Booking.start_ts).limit(limit).offset(offset).all()
    return BookingListOut(total=total, limit=limit, offset=offset, items=items)


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(404, "Booking not found")
    return booking


@router.patch("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(404, "Booking not found")

    is_owner = booking.booked_by == current_user.id
    is_manager = current_user.role in MANAGE_ROLES
    if not (is_owner or is_manager):
        raise HTTPException(403, "You can only cancel your own bookings")

    if booking.status in (BookingStatusEnum.COMPLETED, BookingStatusEnum.CANCELLED):
        raise HTTPException(400, f"Booking is already {booking.status.value}")

    booking.status = BookingStatusEnum.CANCELLED
    db.commit()
    db.refresh(booking)
    return booking