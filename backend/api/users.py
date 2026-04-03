"""
User management API endpoints (admin only)
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.user_admin import UserCreateAdmin, UserUpdateAdmin, UserListResponse
from services.user import UserService
from utils.permissions import require_admin

router = APIRouter()


def _to_response(user: User) -> UserListResponse:
    """Map a User ORM object to UserListResponse."""
    return UserListResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,  # property on User model
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/", response_model=List[UserListResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return [_to_response(u) for u in UserService.list_users(db)]


@router.post("/", response_model=UserListResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from services.exceptions import UserEmailExistsError, ServiceError  # lazy import

    try:
        user = UserService.create_user(db, data, current_user.id)
        return _to_response(user)
    except UserEmailExistsError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except ServiceError as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.put("/{user_id}", response_model=UserListResponse)
def update_user(
    user_id: UUID,
    data: UserUpdateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from services.exceptions import UserNotFoundError, UserEmailExistsError, ServiceError  # lazy import

    try:
        user = UserService.update_user(db, user_id, data, current_user.id)
        return _to_response(user)
    except UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except UserEmailExistsError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except ServiceError as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.put("/{user_id}/deactivate", response_model=UserListResponse)
def deactivate_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from services.exceptions import UserNotFoundError, CannotDeactivateSelfError, ServiceError  # lazy import

    try:
        user = UserService.deactivate_user(db, user_id, current_user.id)
        return _to_response(user)
    except CannotDeactivateSelfError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    except ServiceError as e:
        raise HTTPException(status_code=400, detail=e.message)
