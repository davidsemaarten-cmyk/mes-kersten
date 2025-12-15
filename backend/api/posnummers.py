"""
Posnummers API Routes
Provides endpoints for managing posnummers (part numbers) within fases
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from database import get_db
from models.user import User
from utils.auth import get_current_user
from utils.permissions import require_admin_or_werkvoorbereider
from services import posnummer as posnummer_service
from services.exceptions import (
    PosnummerNotFoundError,
    FaseNotFoundError,
    DuplicatePosnummerError
)
from schemas.posnummer import PosnummerCreate, PosnummerUpdate, PosnummerResponse

router = APIRouter(tags=["Posnummers"])


@router.get("/api/fases/{fase_id}/posnummers", response_model=List[PosnummerResponse])
def list_posnummers(
    fase_id: UUID,
    materiaal: Optional[str] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all posnummers for a specific fase.

    - **Requires authentication**
    - Returns posnummers sorted by posnr
    - Optionally filter by material (case-insensitive)
    - Optionally include soft-deleted posnummers

    Query parameters:
    - materiaal: Filter by material name (e.g., "S235", "RVS 316")
    - include_inactive: Include soft-deleted posnummers (default: false)
    """
    posnummers = posnummer_service.list_posnummers(
        db=db,
        fase_id=fase_id,
        materiaal_filter=materiaal,
        include_inactive=include_inactive
    )

    return posnummers


@router.post("/api/fases/{fase_id}/posnummers", response_model=PosnummerResponse, status_code=status.HTTP_201_CREATED)
def create_posnummer(
    fase_id: UUID,
    data: PosnummerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new posnummer within a fase.

    - **Requires werkvoorbereider or admin role**
    - Posnr must be unique within the fase
    - Material and dimensions are required for proper part tracking

    Example:
    ```json
    {
        "posnr": "001",
        "materiaal": "S235",
        "profiel": "IPE 200",
        "length_mm": 1000,
        "width_mm": null,
        "height_mm": null,
        "quantity": 2,
        "notes": "Gebruikt voor hoofdliggers"
    }
    ```
    """
    require_admin_or_werkvoorbereider(current_user)

    try:
        posnummer = posnummer_service.create_posnummer(
            db=db,
            fase_id=fase_id,
            data=data,
            user_id=current_user.id
        )
        return posnummer

    except FaseNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except DuplicatePosnummerError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/api/posnummers/{posnummer_id}", response_model=PosnummerResponse)
def update_posnummer(
    posnummer_id: UUID,
    data: PosnummerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing posnummer.

    - **Requires werkvoorbereider or admin role**
    - Can update all fields including posnr (if unique within fase)
    - Only provide fields you want to update
    """
    require_admin_or_werkvoorbereider(current_user)

    try:
        posnummer = posnummer_service.update_posnummer(
            db=db,
            posnummer_id=posnummer_id,
            data=data,
            user_id=current_user.id
        )
        return posnummer

    except PosnummerNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except DuplicatePosnummerError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/api/posnummers/{posnummer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_posnummer(
    posnummer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Soft delete a posnummer.

    - **Requires werkvoorbereider or admin role**
    - Sets is_active = False (soft delete)
    - Posnummer remains in database for audit trail
    """
    require_admin_or_werkvoorbereider(current_user)

    try:
        posnummer_service.delete_posnummer(
            db=db,
            posnummer_id=posnummer_id,
            user_id=current_user.id
        )
        return None

    except PosnummerNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
