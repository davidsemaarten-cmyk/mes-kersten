"""
Audit logging utility functions
Provides helper functions for creating audit log entries with proper transaction management
"""
from typing import Optional, Dict, Any
from uuid import UUID
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError


class AuditAction(str, Enum):
    """
    Enumeration of valid audit actions.
    Add new actions here as features are implemented.
    """
    # User actions
    CREATE_USER = "create_user"
    UPDATE_USER = "update_user"
    DELETE_USER = "delete_user"
    LOGIN = "login"
    LOGOUT = "logout"
    UPLOAD_SIGNATURE = "upload_signature"

    # Project actions (Phase 1)
    CREATE_PROJECT = "create_project"
    UPDATE_PROJECT = "update_project"
    DELETE_PROJECT = "delete_project"

    # Fase actions (Phase 1)
    CREATE_FASE = "create_fase"
    UPDATE_FASE = "update_fase"
    DELETE_FASE = "delete_fase"

    # Order actions (Phase 1+)
    CREATE_ORDER = "create_order"
    UPDATE_ORDER = "update_order"
    DELETE_ORDER = "delete_order"
    START_ORDER = "start_order"
    COMPLETE_ORDER = "complete_order"
    APPROVE_ORDER = "approve_order"
    REOPEN_ORDER = "reopen_order"

    # Plate actions
    CREATE_PLATE = "create_plate"
    UPDATE_PLATE = "update_plate"
    DELETE_PLATE = "delete_plate"
    CLAIM_PLATE = "claim_plate"
    UNCLAIM_PLATE = "unclaim_plate"
    CONSUME_PLATE = "consume_plate"
    MOVE_TO_LASER = "move_to_laser"
    MOVE_FROM_LASER = "move_from_laser"
    PROCESS_REMNANT = "process_remnant"

    # Material actions
    CREATE_MATERIAL = "create_material"
    UPDATE_MATERIAL = "update_material"
    DELETE_MATERIAL = "delete_material"

    # Claim actions
    CREATE_CLAIM = "create_claim"
    RELEASE_CLAIM = "release_claim"
    BULK_CLAIM = "bulk_claim"
    RELEASE_BY_PROJECT = "release_by_project"

    # File actions (Phase 2)
    UPLOAD_FILE = "upload_file"
    DELETE_FILE = "delete_file"

    # Certificate actions (Phase 7)
    EXPORT_CERTIFICATES = "export_certificates"


class EntityType(str, Enum):
    """
    Enumeration of valid entity types for audit logging.
    """
    USER = "user"
    PROJECT = "project"
    FASE = "fase"
    ORDER = "order"
    ORDERREEKS = "orderreeks"
    POSNUMMER = "posnummer"
    PLATE = "plate"
    MATERIAL = "material"
    CLAIM = "claim"
    FILE = "file"
    CERTIFICATE = "certificate"


def log_action(
    db: Session,
    user_id: UUID,
    action: AuditAction | str,
    entity_type: Optional[EntityType | str] = None,
    entity_id: Optional[UUID] = None,
    details: Optional[Dict[str, Any]] = None,
    auto_commit: bool = False
) -> "AuditLog":
    """
    Create an audit log entry for a user action.

    This function provides transaction-safe audit logging. By default, it does NOT
    commit the transaction, allowing the calling code to manage transaction boundaries.
    This ensures audit logs are only persisted if the business logic succeeds.

    Args:
        db: Database session
        user_id: UUID of the user performing the action
        action: Action being performed (AuditAction enum or string for custom actions)
        entity_type: Type of entity being acted upon (EntityType enum or string)
        entity_id: UUID of the specific entity (optional)
        details: Additional JSON details about the action (optional)
        auto_commit: If True, commits immediately. Default False for transaction safety.
                    Use False (default) when calling within a larger transaction.
                    Use True only for standalone logging (e.g., login events).

    Returns:
        AuditLog: The created audit log entry

    Raises:
        ValueError: If action or entity_type strings are too long
        SQLAlchemyError: If database operation fails

    Examples:
        >>> # Within a transaction (default, recommended)
        >>> new_project = Project(...)
        >>> db.add(new_project)
        >>> log_action(db, user_id, AuditAction.CREATE_PROJECT,
        ...            EntityType.PROJECT, new_project.id)
        >>> db.commit()  # Commits both project and audit log atomically

        >>> # Standalone logging (auto-commit)
        >>> log_action(db, user_id, AuditAction.LOGIN, auto_commit=True)

    Note:
        When auto_commit=False (default), the calling code MUST commit the session
        to persist the audit log. This ensures atomicity with business operations.
    """
    from models.audit_log import AuditLog  # Import here to avoid circular dependency

    # Input validation
    action_str = action.value if isinstance(action, Enum) else action
    entity_type_str = entity_type.value if isinstance(entity_type, Enum) else entity_type

    # Validate action string length (database column limit)
    if len(action_str) > 255:
        raise ValueError(
            f"Action string too long: {len(action_str)} characters (maximum 255). "
            f"Use AuditAction enum or shorter custom action names."
        )

    # Validate entity_type string length (VARCHAR(50) in database)
    if entity_type_str and len(entity_type_str) > 50:
        raise ValueError(
            f"Entity type too long: {len(entity_type_str)} characters (maximum 50). "
            f"Use EntityType enum or shorter custom type names."
        )

    # Validate details is a dict if provided
    if details is not None and not isinstance(details, dict):
        raise TypeError(f"details must be a dict, got {type(details).__name__}")

    try:
        # Create audit log entry
        audit_entry = AuditLog(
            user_id=user_id,
            action=action_str,
            entity_type=entity_type_str,
            entity_id=entity_id,
            details=details or {}
        )

        db.add(audit_entry)

        if auto_commit:
            # Immediate commit for standalone operations
            db.commit()
            db.refresh(audit_entry)
        else:
            # Flush to get the ID without committing
            # This allows the caller to rollback if needed
            db.flush()

        return audit_entry

    except SQLAlchemyError as e:
        if auto_commit:
            db.rollback()
        raise


def get_entity_audit_trail(
    db: Session,
    entity_type: EntityType | str,
    entity_id: UUID,
    limit: int = 100
) -> list:
    """
    Retrieve audit trail for a specific entity.

    Args:
        db: Database session
        entity_type: Type of entity (EntityType enum or string)
        entity_id: UUID of the entity
        limit: Maximum number of entries to return (default: 100)

    Returns:
        List of AuditLog entries ordered by created_at DESC

    Example:
        >>> trail = get_entity_audit_trail(
        ...     db, EntityType.PROJECT, project_id, limit=50
        ... )
        >>> for entry in trail:
        ...     print(f"{entry.action} by {entry.user_id} at {entry.created_at}")
    """
    from models.audit_log import AuditLog

    entity_type_str = entity_type.value if isinstance(entity_type, Enum) else entity_type

    return db.query(AuditLog)\
        .filter(
            AuditLog.entity_type == entity_type_str,
            AuditLog.entity_id == entity_id
        )\
        .order_by(AuditLog.created_at.desc())\
        .limit(limit)\
        .all()


def get_user_activity(
    db: Session,
    user_id: UUID,
    limit: int = 50
) -> list:
    """
    Retrieve recent activity for a specific user.

    Args:
        db: Database session
        user_id: UUID of the user
        limit: Maximum number of entries to return (default: 50)

    Returns:
        List of AuditLog entries ordered by created_at DESC

    Example:
        >>> activity = get_user_activity(db, user_id, limit=25)
        >>> recent_actions = [entry.action for entry in activity]
    """
    from models.audit_log import AuditLog

    return db.query(AuditLog)\
        .filter(AuditLog.user_id == user_id)\
        .order_by(AuditLog.created_at.desc())\
        .limit(limit)\
        .all()
