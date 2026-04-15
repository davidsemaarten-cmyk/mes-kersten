"""
CSRF Protection for MES Kersten
Implements Double-Submit Cookie pattern with HMAC-signed tokens

Current CSRF protection is provided by:
- SameSite=lax on the access_token cookie (blocks cross-origin POST/PUT/DELETE)
- Strict CORS configuration (only known localhost origins allowed in development)

This module implements the Double-Submit Cookie pattern as an additional layer
of CSRF protection. To activate it, add `validate_csrf` as a dependency on
state-changing routes, and update the frontend to:
  1. Call GET /api/auth/csrf-token after login to receive a csrf_token cookie
  2. Read the csrf_token cookie value (it is NOT httpOnly)
  3. Send it in the X-CSRF-Token header on all POST/PUT/DELETE/PATCH requests

TODO: Wire up validate_csrf once the frontend sends X-CSRF-Token headers.
      Until then, SameSite=lax + CORS provides the primary CSRF mitigation.

Security Pattern (when activated):
1. Server generates CSRF token and signs it with secret key
2. Token sent in both cookie (csrf_token) and response header (X-CSRF-Token)
3. Client must send token in X-CSRF-Token header for state-changing requests
4. Server validates token signature and compares cookie vs header values
"""

import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Request, HTTPException, status, Response
from config import settings


# CSRF token validity period
CSRF_TOKEN_EXPIRE_HOURS = 24


def generate_csrf_token() -> str:
    """
    Generate a cryptographically secure CSRF token

    Returns:
        CSRF token string (32 bytes hex = 64 characters)
    """
    return secrets.token_hex(32)


def sign_csrf_token(token: str) -> str:
    """
    Sign CSRF token with HMAC-SHA256 using SECRET_KEY

    Args:
        token: Raw CSRF token

    Returns:
        Signed token (format: timestamp:token:signature)
    """
    # Add timestamp for expiration check
    timestamp = str(int(datetime.now(timezone.utc).timestamp()))

    # Create HMAC signature
    message = f"{timestamp}:{token}"
    signature = hmac.new(
        settings.SECRET_KEY.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    return f"{timestamp}:{token}:{signature}"


def verify_csrf_token(signed_token: str) -> bool:
    """
    Verify CSRF token signature and expiration

    Args:
        signed_token: Signed token to verify (format: timestamp:token:signature)

    Returns:
        True if token is valid and not expired, False otherwise
    """
    try:
        parts = signed_token.split(":")
        if len(parts) != 3:
            return False

        timestamp_str, token, signature = parts

        # Verify signature
        message = f"{timestamp_str}:{token}"
        expected_signature = hmac.new(
            settings.SECRET_KEY.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            return False

        # Check expiration
        timestamp = int(timestamp_str)
        token_age = datetime.now(timezone.utc).timestamp() - timestamp
        max_age = CSRF_TOKEN_EXPIRE_HOURS * 3600  # Convert to seconds

        if token_age > max_age:
            return False

        return True

    except (ValueError, AttributeError):
        return False


def set_csrf_cookie(response: Response, token: str):
    """
    Set CSRF token cookie on response

    Args:
        response: FastAPI Response object
        token: Signed CSRF token
    """
    response.set_cookie(
        key="csrf_token",
        value=token,
        httponly=False,  # JavaScript needs to read this for X-CSRF-Token header
        secure=True,  # Required when SameSite=none
        samesite="none",  # Cross-origin cookie (frontend ≠ backend domain)
        max_age=CSRF_TOKEN_EXPIRE_HOURS * 3600,  # Convert to seconds
        path="/",
        domain=None
    )


def get_csrf_token(request: Request, response: Response) -> str:
    """
    Get or generate CSRF token for user session

    Args:
        request: FastAPI Request object
        response: FastAPI Response object (to set cookie if needed)

    Returns:
        Signed CSRF token
    """
    # Check if valid token exists in cookie
    existing_token = request.cookies.get("csrf_token")

    if existing_token and verify_csrf_token(existing_token):
        return existing_token

    # Generate new token
    raw_token = generate_csrf_token()
    signed_token = sign_csrf_token(raw_token)

    # Set cookie
    set_csrf_cookie(response, signed_token)

    return signed_token


def validate_csrf(request: Request) -> None:
    """
    Validate CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)

    Raises:
        HTTPException: 403 if CSRF validation fails

    Usage:
        As a dependency in route:
        @router.post("/create")
        def create_item(csrf_check: None = Depends(validate_csrf)):
            ...
    """
    # Only validate for state-changing methods
    if request.method not in ["POST", "PUT", "DELETE", "PATCH"]:
        return

    # Get CSRF token from header
    header_token = request.headers.get("X-CSRF-Token")

    if not header_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missend in request header (X-CSRF-Token)"
        )

    # Get CSRF token from cookie
    cookie_token = request.cookies.get("csrf_token")

    if not cookie_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missend in cookie"
        )

    # Verify both tokens are valid
    if not verify_csrf_token(header_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ongeldige CSRF token in header"
        )

    if not verify_csrf_token(cookie_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ongeldige CSRF token in cookie"
        )

    # Verify header token matches cookie token (Double-Submit Cookie pattern)
    if not hmac.compare_digest(header_token, cookie_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token mismatch tussen header en cookie"
        )
