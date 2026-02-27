"""
Permission Dependencies for FastAPI
Reusable authorization checks using dependency injection
"""

from fastapi import Depends, HTTPException, status
from models.user import User
from utils.auth import get_current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that requires admin role

    Args:
        current_user: Current authenticated user

    Returns:
        User object if authorized

    Raises:
        HTTPException: 403 if user is not admin
    """
    user_roles = [role.role for role in current_user.roles]
    if 'admin' not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Alleen admin heeft toegang tot deze functie"
        )
    return current_user


def require_admin_or_werkvoorbereider(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that requires admin or werkvoorbereider role

    Args:
        current_user: Current authenticated user

    Returns:
        User object if authorized

    Raises:
        HTTPException: 403 if user is not admin or werkvoorbereider
    """
    user_roles = [role.role for role in current_user.roles]
    if 'admin' not in user_roles and 'werkvoorbereider' not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Alleen admin en werkvoorbereider hebben toegang tot deze functie"
        )
    return current_user


def require_werkplaats_access(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that requires werkplaats, logistiek, admin, or werkvoorbereider role

    Args:
        current_user: Current authenticated user

    Returns:
        User object if authorized

    Raises:
        HTTPException: 403 if user doesn't have required role
    """
    user_roles = [role.role for role in current_user.roles]
    allowed_roles = ['admin', 'werkvoorbereider', 'werkplaats', 'logistiek']

    if not any(role in user_roles for role in allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Je hebt geen toegang tot deze functie"
        )
    return current_user


def require_any_authenticated(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that just requires authentication (any role)

    Args:
        current_user: Current authenticated user

    Returns:
        User object if authenticated

    Raises:
        HTTPException: 401 if not authenticated
    """
    # get_current_user already handles authentication check
    return current_user
