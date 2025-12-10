"""
MES Kersten - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import uvicorn
import logging

# Import routers
from api import auth, platestock

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="MES Kersten API",
    description="Manufacturing Execution System for M.C. Kersten",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

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
async def health_check():
    return {
        "status": "healthy",
        "database": "connected"  # TODO: Add actual DB check
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
# app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
# ... more routers

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
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )
