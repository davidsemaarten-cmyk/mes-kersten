"""
Service layer for Posnummer operations.

Handles business logic for:
- Creating and managing posnummers (part numbers) within fases
- Validating unique posnr within fase
- Listing and filtering posnummers
- Soft delete operations
"""

from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from models.posnummer import Posnummer
from models.fase import Fase
from schemas.posnummer import PosnummerCreate, PosnummerUpdate
from services.exceptions import (
    PosnummerNotFoundError,
    FaseNotFoundError,
    DuplicatePosnummerError
)


def create_posnummer(
    db: Session,
    fase_id: UUID,
    data: PosnummerCreate,
    user_id: UUID
) -> Posnummer:
    """
    Create a new posnummer within a fase.

    Args:
        db: Database session
        fase_id: UUID of the fase
        data: Posnummer creation data
        user_id: UUID of the user creating the posnummer (for audit logging)

    Returns:
        Created Posnummer instance

    Raises:
        FaseNotFoundError: If fase doesn't exist
        DuplicatePosnummerError: If posnr already exists within this fase
    """
    # Verify fase exists
    fase = db.query(Fase).filter(Fase.id == fase_id).first()
    if not fase:
        raise FaseNotFoundError(f"Fase {fase_id} not found")

    # Check for duplicate posnr within fase
    existing = db.query(Posnummer).filter(
        Posnummer.fase_id == fase_id,
        Posnummer.posnr == data.posnr,
        Posnummer.is_active == True
    ).first()

    if existing:
        raise DuplicatePosnummerError(
            f"Posnummer '{data.posnr}' already exists in this fase"
        )

    # Create posnummer
    posnummer = Posnummer(
        fase_id=fase_id,
        posnr=data.posnr,
        materiaal=data.materiaal,
        profiel=data.profiel,
        length_mm=data.length_mm,
        width_mm=data.width_mm,
        height_mm=data.height_mm,
        quantity=data.quantity or 1,
        notes=data.notes
    )

    try:
        db.add(posnummer)
        db.flush()  # Get ID without committing

        # Audit logging would go here
        # log_action(db, user_id, AuditAction.CREATE_POSNUMMER,
        #            EntityType.POSNUMMER, posnummer.id)

        db.commit()
        db.refresh(posnummer)
        return posnummer

    except IntegrityError as e:
        db.rollback()
        raise DuplicatePosnummerError(
            f"Database constraint violation: {str(e)}"
        )


def list_posnummers(
    db: Session,
    fase_id: UUID,
    materiaal_filter: Optional[str] = None,
    include_inactive: bool = False
) -> List[Posnummer]:
    """
    List all posnummers for a fase with optional filtering.

    Args:
        db: Database session
        fase_id: UUID of the fase
        materiaal_filter: Optional material filter (case-insensitive)
        include_inactive: Whether to include soft-deleted posnummers

    Returns:
        List of Posnummer instances
    """
    query = db.query(Posnummer).filter(Posnummer.fase_id == fase_id)

    if not include_inactive:
        query = query.filter(Posnummer.is_active == True)

    if materiaal_filter:
        query = query.filter(
            Posnummer.materiaal.ilike(f"%{materiaal_filter}%")
        )

    return query.order_by(Posnummer.posnr).all()


def get_posnummer(db: Session, posnummer_id: UUID) -> Posnummer:
    """
    Get a single posnummer by ID.

    Args:
        db: Database session
        posnummer_id: UUID of the posnummer

    Returns:
        Posnummer instance

    Raises:
        PosnummerNotFoundError: If posnummer doesn't exist
    """
    posnummer = db.query(Posnummer).filter(
        Posnummer.id == posnummer_id,
        Posnummer.is_active == True
    ).first()

    if not posnummer:
        raise PosnummerNotFoundError(f"Posnummer {posnummer_id} not found")

    return posnummer


def update_posnummer(
    db: Session,
    posnummer_id: UUID,
    data: PosnummerUpdate,
    user_id: UUID
) -> Posnummer:
    """
    Update an existing posnummer.

    Args:
        db: Database session
        posnummer_id: UUID of the posnummer
        data: Updated posnummer data
        user_id: UUID of the user updating (for audit logging)

    Returns:
        Updated Posnummer instance

    Raises:
        PosnummerNotFoundError: If posnummer doesn't exist
        DuplicatePosnummerError: If updating posnr would create duplicate
    """
    posnummer = get_posnummer(db, posnummer_id)

    # Check for duplicate if posnr is being changed
    if data.posnr and data.posnr != posnummer.posnr:
        existing = db.query(Posnummer).filter(
            Posnummer.fase_id == posnummer.fase_id,
            Posnummer.posnr == data.posnr,
            Posnummer.id != posnummer_id,
            Posnummer.is_active == True
        ).first()

        if existing:
            raise DuplicatePosnummerError(
                f"Posnummer '{data.posnr}' already exists in this fase"
            )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(posnummer, key, value)

    try:
        db.flush()

        # Audit logging would go here
        # log_action(db, user_id, AuditAction.UPDATE_POSNUMMER,
        #            EntityType.POSNUMMER, posnummer.id)

        db.commit()
        db.refresh(posnummer)
        return posnummer

    except IntegrityError as e:
        db.rollback()
        raise DuplicatePosnummerError(
            f"Database constraint violation: {str(e)}"
        )


def delete_posnummer(
    db: Session,
    posnummer_id: UUID,
    user_id: UUID
) -> bool:
    """
    Soft delete a posnummer.

    Args:
        db: Database session
        posnummer_id: UUID of the posnummer
        user_id: UUID of the user deleting (for audit logging)

    Returns:
        True if successful

    Raises:
        PosnummerNotFoundError: If posnummer doesn't exist
    """
    posnummer = get_posnummer(db, posnummer_id)

    posnummer.is_active = False

    db.flush()

    # Audit logging would go here
    # log_action(db, user_id, AuditAction.DELETE_POSNUMMER,
    #            EntityType.POSNUMMER, posnummer.id)

    db.commit()
    return True


def get_posnummer_count_for_fase(db: Session, fase_id: UUID) -> int:
    """
    Get the count of active posnummers for a fase.

    Args:
        db: Database session
        fase_id: UUID of the fase

    Returns:
        Count of active posnummers
    """
    return db.query(Posnummer).filter(
        Posnummer.fase_id == fase_id,
        Posnummer.is_active == True
    ).count()
