"""
Authentication API endpoints
Login, logout, and current user endpoints
Following PROJECT-MASTER.md patterns
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_db
from models.user import User
from schemas.user import UserLogin, UserResponse
from utils.auth import (
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter()

# Initialize limiter for rate limiting
limiter = Limiter(key_func=get_remote_address)


@router.post("/login", response_model=dict)
@limiter.limit("5/minute")
def login(
    request: Request,
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login endpoint

    Authenticates user with email and password, returns JWT token

    Rate Limited: 5 attempts per minute per IP address

    Args:
        request: FastAPI Request object (for rate limiting)
        credentials: UserLogin schema with email and password
        db: Database session

    Returns:
        Dictionary with token and user info (including role)

    Raises:
        HTTPException: 401 if credentials are invalid
        HTTPException: 429 if rate limit exceeded
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Onjuiste email of wachtwoord"
        )

    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Onjuiste email of wachtwoord"
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is niet actief"
        )

    # Get user's primary role (first role if multiple exist)
    user_role = user.roles[0].role if user.roles else None

    if not user_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gebruiker heeft geen toegewezen rol"
        )

    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})

    # Return token and user info (including role)
    return {
        "token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user_role,
            "is_active": user.is_active,
            "digital_signature_url": user.digital_signature_url,
            "signature_uploaded_at": user.signature_uploaded_at.isoformat() if user.signature_uploaded_at else None,
            "created_at": user.created_at.isoformat(),
            "updated_at": user.updated_at.isoformat()
        }
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user info
    
    Returns the currently authenticated user's information
    
    Args:
        current_user: Current authenticated user from JWT token
        
    Returns:
        UserResponse with current user information
    """
    return current_user


@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user)
):
    """
    Logout endpoint
    
    This is mainly for consistency. JWT tokens are stateless,
    so actual logout is handled client-side by removing the token.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Success message
    """
    return {
        "message": "Succesvol uitgelogd",
        "detail": "Token moet client-side worden verwijderd"
    }
