from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from database import get_db
from models.user import User
from schemas.laserplanner import (
    JobCreate, JobUpdate, JobResponse, JobWithLineItems,
    CSVUploadResponse, LineItemSelection
)
from services.laserplanner import LaserplannerService
from services.exceptions import (
    LaserJobNotFoundError, LaserJobNameExistsError,
    InvalidCSVFormatError
)
from utils.auth import get_current_user
from utils.permissions import require_admin_or_werkvoorbereider

router = APIRouter()

# ============================================================
# JOB ENDPOINTS
# ============================================================

@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """Create a new laser job"""
    try:
        job = LaserplannerService.create_job(
            db=db,
            naam=job_data.naam,
            beschrijving=job_data.beschrijving,
            project_id=job_data.project_id,
            fase_id=job_data.fase_id,
            current_user=current_user
        )
        return job
    except LaserJobNameExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/jobs", response_model=List[JobResponse])
async def list_jobs(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """List all laser jobs"""
    jobs = LaserplannerService.list_jobs(db=db, status_filter=status_filter)
    return jobs

@router.get("/jobs/{job_id}", response_model=JobWithLineItems)
async def get_job(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """Get job details with line items"""
    job = LaserplannerService.get_job(db=db, job_id=job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    return job

@router.patch("/jobs/{job_id}/status", response_model=JobResponse)
async def update_job_status(
    job_id: UUID,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """Update job status"""
    try:
        job = LaserplannerService.update_job_status(
            db=db,
            job_id=job_id,
            status=status,
            current_user=current_user
        )
        return job
    except LaserJobNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """Delete a laser job"""
    try:
        LaserplannerService.delete_job(db=db, job_id=job_id, current_user=current_user)
    except LaserJobNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")

# ============================================================
# CSV UPLOAD ENDPOINTS
# ============================================================

@router.post("/csv/parse", response_model=CSVUploadResponse)
async def parse_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """Parse CSV file and return preview"""
    try:
        content = await file.read()
        csv_text = content.decode('utf-8')

        parsed = LaserplannerService.parse_csv(csv_text)

        return {
            "metadata": parsed["metadata"],
            "headers": parsed["headers"],
            "rows": parsed["rows"]
        }
    except InvalidCSVFormatError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Fout bij inlezen CSV: {str(e)}")

@router.post("/jobs/{job_id}/line-items", response_model=JobWithLineItems)
async def add_line_items(
    job_id: UUID,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """Add selected line items to a job"""
    try:
        # Extract data from payload
        selection = payload.get('selection', {})
        selected_row_numbers = selection.get('selected_row_numbers', [])
        csv_metadata = payload.get('csv_metadata', {})
        all_rows = payload.get('all_rows', [])

        # Filter rows based on selection
        selected_rows = [
            row for row in all_rows
            if row.get('row_number') in selected_row_numbers
        ]

        job = LaserplannerService.add_line_items(
            db=db,
            job_id=job_id,
            csv_metadata=csv_metadata,
            line_items=selected_rows,
            current_user=current_user
        )

        return job
    except LaserJobNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
