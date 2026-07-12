from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.audit import AuditCycle, AuditCycleAuditor, AuditFinding
from app.models.asset import Asset, AssetStatusHistory
from app.models.org import Employee, Department
from app.models.enums import (
    AuditCycleStatusEnum, DiscrepancyTypeEnum, AssetStatusEnum, RoleEnum,
)
from app.schemas.audit import (
    AuditCycleCreate, AuditCycleOut, AuditorAssign,
    FindingCreate, FindingResolve, FindingOut,
)

router = APIRouter(prefix="/audits", tags=["audits"])

ADMIN_ONLY = require_roles(RoleEnum.ADMIN)
MANAGE_ROLES = require_roles(RoleEnum.ADMIN, RoleEnum.ASSET_MANAGER)


def _infer_discrepancy(expected: str, observed: str) -> DiscrepancyTypeEnum | None:
    """
    Maps an expected/observed status mismatch to a discrepancy category.
    This is a simple rules table rather than free-text — keeps findings
    queryable/reportable by type instead of parsing prose later.
    """
    if expected == observed:
        return None
    if observed == AssetStatusEnum.LOST.value:
        return DiscrepancyTypeEnum.MISSING_ASSET
    if expected == AssetStatusEnum.ALLOCATED.value and observed == AssetStatusEnum.AVAILABLE.value:
        return DiscrepancyTypeEnum.MISALLOCATED
    return DiscrepancyTypeEnum.WRONG_STATUS


@router.post("", response_model=AuditCycleOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(ADMIN_ONLY)])
def create_audit_cycle(payload: AuditCycleCreate, db: Session = Depends(get_db)):
    if payload.scope_department_id is not None:
        dept = db.get(Department, payload.scope_department_id)
        if dept is None or not dept.is_active:
            raise HTTPException(400, "scope_department_id does not reference an active department")

    cycle = AuditCycle(**payload.model_dump())
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    return cycle


@router.get("", response_model=list[AuditCycleOut])
def list_audit_cycles(
    status_filter: AuditCycleStatusEnum | None = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    query = db.query(AuditCycle)
    if status_filter is not None:
        query = query.filter(AuditCycle.status == status_filter)
    return query.order_by(AuditCycle.start_date.desc()).all()


@router.get("/{cycle_id}", response_model=AuditCycleOut)
def get_audit_cycle(cycle_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    cycle = db.get(AuditCycle, cycle_id)
    if cycle is None:
        raise HTTPException(404, "Audit cycle not found")
    return cycle


@router.post("/{cycle_id}/auditors", status_code=status.HTTP_201_CREATED, dependencies=[Depends(ADMIN_ONLY)])
def assign_auditor(cycle_id: int, payload: AuditorAssign, db: Session = Depends(get_db)):
    cycle = db.get(AuditCycle, cycle_id)
    if cycle is None:
        raise HTTPException(404, "Audit cycle not found")

    employee = db.get(Employee, payload.employee_id)
    if employee is None or not employee.is_active:
        raise HTTPException(400, "employee_id does not reference an active employee")

    existing = (
        db.query(AuditCycleAuditor)
        .filter(AuditCycleAuditor.audit_cycle_id == cycle_id, AuditCycleAuditor.employee_id == payload.employee_id)
        .first()
    )
    if existing is not None:
        raise HTTPException(409, "This employee is already assigned as an auditor for this cycle")

    assignment = AuditCycleAuditor(audit_cycle_id=cycle_id, employee_id=payload.employee_id)
    db.add(assignment)
    db.commit()
    return {"audit_cycle_id": cycle_id, "employee_id": payload.employee_id}


@router.post("/{cycle_id}/findings", response_model=FindingOut, status_code=status.HTTP_201_CREATED)
def record_finding(cycle_id: int, payload: FindingCreate, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    cycle = db.get(AuditCycle, cycle_id)
    if cycle is None:
        raise HTTPException(404, "Audit cycle not found")
    if cycle.status == AuditCycleStatusEnum.COMPLETED:
        raise HTTPException(400, "Cannot record findings on a completed audit cycle")

    is_assigned_auditor = (
        db.query(AuditCycleAuditor)
        .filter(AuditCycleAuditor.audit_cycle_id == cycle_id, AuditCycleAuditor.employee_id == current_user.id)
        .first()
        is not None
    )
    if not (is_assigned_auditor or current_user.role == RoleEnum.ADMIN):
        raise HTTPException(403, "Only assigned auditors or admins can record findings for this cycle")

    asset = db.get(Asset, payload.asset_id)
    if asset is None:
        raise HTTPException(404, "Asset not found")

    if cycle.status == AuditCycleStatusEnum.SCHEDULED:
        cycle.status = AuditCycleStatusEnum.IN_PROGRESS

    expected = asset.status.value
    observed = payload.observed_status.value
    discrepancy = _infer_discrepancy(expected, observed)

    finding = AuditFinding(
        audit_cycle_id=cycle_id,
        asset_id=payload.asset_id,
        expected_status=expected,
        observed_status=observed,
        discrepancy_type=discrepancy,
        resolved=(discrepancy is None),  # no mismatch = nothing to resolve
    )
    db.add(finding)
    db.commit()
    db.refresh(finding)
    return finding


@router.get("/{cycle_id}/findings", response_model=list[FindingOut])
def list_findings(cycle_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    cycle = db.get(AuditCycle, cycle_id)
    if cycle is None:
        raise HTTPException(404, "Audit cycle not found")
    return db.query(AuditFinding).filter(AuditFinding.audit_cycle_id == cycle_id).order_by(AuditFinding.created_at.desc()).all()


@router.patch("/{cycle_id}/findings/{finding_id}/resolve", response_model=FindingOut, dependencies=[Depends(MANAGE_ROLES)])
def resolve_finding(cycle_id: int, finding_id: int, payload: FindingResolve, db: Session = Depends(get_db)):
    finding = db.get(AuditFinding, finding_id)
    if finding is None or finding.audit_cycle_id != cycle_id:
        raise HTTPException(404, "Finding not found for this audit cycle")
    if finding.resolved:
        raise HTTPException(400, "This finding is already resolved")

    finding.resolved = True
    finding.resolution_note = payload.resolution_note
    db.commit()
    db.refresh(finding)
    return finding


@router.patch("/{cycle_id}/close", response_model=AuditCycleOut, dependencies=[Depends(ADMIN_ONLY)])
def close_audit_cycle(cycle_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    """
    Closing walks every UNRESOLVED finding and pushes the observed status
    onto the live asset — this is the "reconcile reality with the system"
    step. Resolved findings (auditor confirmed it was a data-entry error,
    etc.) are left alone; only unresolved ones are trusted enough to
    overwrite the asset record.
    """
    cycle = db.get(AuditCycle, cycle_id)
    if cycle is None:
        raise HTTPException(404, "Audit cycle not found")
    if cycle.status == AuditCycleStatusEnum.COMPLETED:
        raise HTTPException(400, "Audit cycle is already completed")

    unresolved = (
        db.query(AuditFinding)
        .filter(AuditFinding.audit_cycle_id == cycle_id, AuditFinding.resolved.is_(False))
        .all()
    )

    for finding in unresolved:
        asset = db.get(Asset, finding.asset_id)
        if asset is None:
            continue
        new_status = AssetStatusEnum(finding.observed_status)
        if asset.status != new_status:
            db.add(AssetStatusHistory(
                asset_id=asset.id, from_status=asset.status.value, to_status=new_status.value,
                changed_by=current_user.id, reason=f"Audit cycle #{cycle.id} closure — reconciled to observed status",
            ))
            asset.status = new_status
        finding.resolved = True
        finding.resolution_note = finding.resolution_note or "Auto-resolved on audit cycle closure"

    cycle.status = AuditCycleStatusEnum.COMPLETED
    db.commit()
    db.refresh(cycle)
    return cycle