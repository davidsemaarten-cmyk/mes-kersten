"""
MES Kersten - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI, Request, Depends, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session
import uvicorn
import logging

# Import routers
from api import auth, platestock, projects, order_types, orders, posnummers
from database import get_db

# Configure logging with rotation
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

# Create logs directory if it doesn't exist
logs_dir = Path("logs")
logs_dir.mkdir(exist_ok=True)

# Configure structured logging
log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s - [%(filename)s:%(lineno)d]'

# Console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(logging.Formatter(log_format))

# File handler with rotation (10MB per file, keep 5 backups)
file_handler = RotatingFileHandler(
    logs_dir / "mes_kersten.log",
    maxBytes=10 * 1024 * 1024,  # 10MB
    backupCount=5,
    encoding='utf-8'
)
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(logging.Formatter(log_format))

# Error file handler (separate log for errors)
error_handler = RotatingFileHandler(
    logs_dir / "mes_kersten_errors.log",
    maxBytes=10 * 1024 * 1024,  # 10MB
    backupCount=5,
    encoding='utf-8'
)
error_handler.setLevel(logging.ERROR)
error_handler.setFormatter(logging.Formatter(log_format))

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    handlers=[console_handler, file_handler, error_handler]
)

logger = logging.getLogger(__name__)
logger.info("="*50)
logger.info("MES Kersten Backend Starting...")
logger.info("="*50)


# ============================================================
# SECURITY HEADERS MIDDLEWARE
# ============================================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds security headers to all responses

    Headers added:
    - X-Content-Type-Options: Prevents MIME type sniffing
    - X-Frame-Options: Prevents clickjacking
    - X-XSS-Protection: Enables XSS filter
    - Strict-Transport-Security: Forces HTTPS (production only)
    - Content-Security-Policy: Restricts resource loading
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # Enable XSS protection
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Force HTTPS in production (disabled in development)
        if not request.url.hostname in ["localhost", "127.0.0.1"]:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Content Security Policy - only for HTML responses
        if response.headers.get("content-type", "").startswith("text/html"):
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:;"
            )

        return response

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="MES Kersten API",
    description="Manufacturing Execution System for M.C. Kersten",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS configuration
# TODO: Update CORS_ORIGINS in .env for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177"
    ],  # Frontend dev server (multiple ports for flexibility)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "MES Kersten API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint with actual database connectivity test

    Returns:
        Status information including database connectivity

    Raises:
        HTTPException: 503 if database is unavailable
    """
    from sqlalchemy import text
    from datetime import datetime

    try:
        # Test database connection with simple query
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable"
        )

    return {
        "status": "healthy",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat()
    }

# Exception handlers - MUST BE REGISTERED BEFORE ROUTERS
# This ensures validation errors are properly caught and formatted

# Handle FastAPI validation errors (422)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle Pydantic validation errors.
    Returns 422 with properly formatted error details.

    CRITICAL: Registered before routers to ensure it catches validation errors.
    """
    logger.warning(f"Validation error on {request.method} {request.url.path}")
    logger.debug(f"Validation errors: {exc.errors()}")

    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validatie fout",
            "errors": exc.errors()
        }
    )

# Handle HTTP exceptions (404, 400, etc.)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Handle HTTP exceptions (404, 401, 403, etc.)
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

# Handle unexpected errors (500) - but don't catch validation errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Last resort handler for unexpected errors.
    Only catches errors that aren't RequestValidationError or HTTPException.
    """
    import traceback
    # Log the full error for debugging
    logger.error(f"Unexpected error on {request.method} {request.url.path}: {exc}")
    traceback.print_exc()

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if app.debug else "An unexpected error occurred"
        }
    )

# Include routers - AFTER EXCEPTION HANDLERS
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(platestock.router, prefix="/api/platestock", tags=["PlateStock"])
app.include_router(projects.router, prefix="/api", tags=["Projects"])
app.include_router(order_types.router)
app.include_router(orders.router)
app.include_router(posnummers.router)

if __name__ == "__main__":
    print("=" * 50)
    print("MES Kersten Backend Server")
    print("=" * 50)
    print("API Docs: http://localhost:8000/docs")
    print("Health: http://localhost:8000/health")
    print("=" * 50)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Auto-reload disabled (causes restart loop with logging)
        log_level="info"
    )
