import enum


class RoleEnum(str, enum.Enum):
    EMPLOYEE = "Employee"
    DEPARTMENT_HEAD = "DepartmentHead"
    ASSET_MANAGER = "AssetManager"
    ADMIN = "Admin"


class AssetStatusEnum(str, enum.Enum):
    AVAILABLE = "Available"
    ALLOCATED = "Allocated"
    RESERVED = "Reserved"
    UNDER_MAINTENANCE = "UnderMaintenance"
    LOST = "Lost"
    RETIRED = "Retired"
    DISPOSED = "Disposed"


class TransferStatusEnum(str, enum.Enum):
    REQUESTED = "Requested"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    COMPLETED = "Completed"


class BookingStatusEnum(str, enum.Enum):
    UPCOMING = "Upcoming"
    ONGOING = "Ongoing"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class MaintenanceStatusEnum(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    TECHNICIAN_ASSIGNED = "TechnicianAssigned"
    IN_PROGRESS = "InProgress"
    RESOLVED = "Resolved"


class AuditCycleStatusEnum(str, enum.Enum):
    SCHEDULED = "Scheduled"
    IN_PROGRESS = "InProgress"
    COMPLETED = "Completed"


class DiscrepancyTypeEnum(str, enum.Enum):
    MISSING_ASSET = "MissingAsset"
    MISALLOCATED = "Misallocated"
    WRONG_STATUS = "WrongStatus"
    LOCATION_MISMATCH = "LocationMismatch"
    DAMAGED = "Damaged"
