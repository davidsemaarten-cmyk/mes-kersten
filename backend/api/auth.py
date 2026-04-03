"""
Authentication API endpoints
Login, logout, and current user endpoints
Following PROJECT-MASTER.md patterns
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_db
from models.user import User
from schemas.user import UserLogin, UserResponse, LoginResponse, MessageResponse, CsrfTokenResponse
from utils.auth import (
    verify_password,
    create_access_token,
    get_current_user
)
from utils.csrf import get_csrf_token
from config import settings

router = APIRouter()

# Initialize limiter for rate limiting
limiter = Limiter(key_func=get_remote_address)


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    response: Response,
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login endpoint

    Authenticates user with email and password, sets httpOnly cookie

    Rate Limited: 5 attempts per minute per IP address

    Args:
        request: FastAPI Request object (for rate limiting)
        response: FastAPI Response object (for setting cookies)
        credentials: UserLogin schema with email and password
        db: Database session

    Returns:
        Dictionary with user info (NO token in body - stored in httpOnly cookie)

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

    # Set httpOnly cookie (XSS protection)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,  # Not accessible to JavaScript (XSS protection)
        secure=not settings.DEBUG,  # HTTPS only in production
        samesite="lax",  # CSRF protection
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
        path="/",
        domain=None  # Same domain only
    )

    # Generate and set CSRF token
    csrf_token = get_csrf_token(request, response)

    # Return user info + CSRF token (NO JWT token in response body)
    return {
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
        },
        "csrf_token": csrf_token
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


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    current_user: User = Depends(get_current_user)
):
    """
    Logout endpoint

    Clears the httpOnly authentication cookie

    Args:
        response: FastAPI Response object (for clearing cookies)
        current_user: Current authenticated user

    Returns:
        Success message
    """
    # Clear the httpOnly cookie
    response.delete_cookie(
        key="access_token",
        path="/",
        domain=None
    )

    return {
        "message": "Succesvol uitgelogd",
        "detail": "Authenticatie cookie is verwijderd"
    }


@router.get("/csrf-token", response_model=CsrfTokenResponse)
def get_csrf(
    request: Request,
    response: Response
):
    """
    Get CSRF token for authenticated users

    Returns CSRF token in both response body and cookie.
    Client must send this token in X-CSRF-Token header for state-changing requests.

    Args:
        request: FastAPI Request object
        response: FastAPI Response object (for setting cookies)

    Returns:
        Dictionary with CSRF token
    """
    csrf_token = get_csrf_token(request, response)

    return {
        "csrf_token": csrf_token,
        "detail": "CSRF token gegenereerd. Stuur dit token in X-CSRF-Token header voor POST/PUT/DELETE requests."
    }
