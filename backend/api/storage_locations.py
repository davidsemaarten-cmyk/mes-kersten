"""
Storage Locations API Router
Admin-only CRUD operations for managing storage locations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db
from models.user import User
from models.storage_location import StorageLocation
from schemas.storage_location import (
    StorageLocationCreate,
    StorageLocationUpdate,
    StorageLocationResponse,
    StorageLocationList
)
from utils.auth import get_current_user
from utils.permissions import require_admin

router = APIRouter(prefix="/api/storage-locations", tags=["storage-locations"])


@router.get("/", response_model=List[StorageLocationResponse])
async def list_storage_locations(
    include_inactive: bool = Query(False, description="Include inactive locations"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # All authenticated users can view
):
    """
    Get list of storage locations

    - **include_inactive**: If true, includes inactive locations (default: false)
    """
    query = db.query(StorageLocation)

    if not include_inactive:
        query = query.filter(StorageLocation.actief == True)

    locations = query.order_by(StorageLocation.naam).all()
    return locations


@router.get("/{location_id}", response_model=StorageLocationResponse)
async def get_storage_location(
    location_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single storage location by ID"""
    location = db.query(StorageLocation).filter(StorageLocation.id == location_id).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opslaglocatie met ID {location_id} niet gevonden"
        )

    return location


@router.post("/", response_model=StorageLocationResponse, status_code=status.HTTP_201_CREATED)
async def create_storage_location(
    location_data: StorageLocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # Admin only
):
    """
    Create a new storage location (Admin only)

    Validates that the location name is unique (case-insensitive)
    """
    # Check for duplicate name (case-insensitive)
    existing = db.query(StorageLocation).filter(
        func.lower(StorageLocation.naam) == func.lower(location_data.naam)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Opslaglocatie met naam '{location_data.naam}' bestaat al"
        )

    # Create new location
    new_location = StorageLocation(
        naam=location_data.naam.strip(),
        beschrijving=location_data.beschrijving.strip() if location_data.beschrijving else None,
        actief=True
    )

    db.add(new_location)
    db.commit()
    db.refresh(new_location)

    return new_location


@router.put("/{location_id}", response_model=StorageLocationResponse)
async def update_storage_location(
    location_id: str,
    location_data: StorageLocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # Admin only
):
    """
    Update a storage location (Admin only)

    Can update name, description, or active status
    """
    location = db.query(StorageLocation).filter(StorageLocation.id == location_id).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opslaglocatie met ID {location_id} niet gevonden"
        )

    # If updating name, check for duplicates
    if location_data.naam is not None and location_data.naam.strip() != location.naam:
        existing = db.query(StorageLocation).filter(
            func.lower(StorageLocation.naam) == func.lower(location_data.naam),
            StorageLocation.id != location_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Opslaglocatie met naam '{location_data.naam}' bestaat al"
            )

        location.naam = location_data.naam.strip()

    # Update other fields if provided
    if location_data.beschrijving is not None:
        location.beschrijving = location_data.beschrijving.strip() if location_data.beschrijving else None

    if location_data.actief is not None:
        location.actief = location_data.actief

    db.commit()
    db.refresh(location)

    return location


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_storage_location(
    location_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # Admin only
):
    """
    Soft delete a storage location (Admin only)

    Sets actief=false instead of physically deleting the record
    """
    location = db.query(StorageLocation).filter(StorageLocation.id == location_id).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opslaglocatie met ID {location_id} niet gevonden"
        )

    # Soft delete
    location.actief = False
    db.commit()

    return None
