from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Body, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from database import get_db
from models.user import User
from schemas.laserplanner import (
    JobCreate, JobUpdate, JobResponse, JobWithLineItems,
    CSVUploadResponse, LineItemSelection,
    CSVImportResponse, CSVImportDetailResponse,
    DXFFileResponse, DXFFileDetailResponse, DXFUploadResult,
    SingleDXFUploadResult, LineItemUpdate, ManualLineItemCreate,
    LineItemResponse,
)
from services.laserplanner import LaserplannerService
from services.exceptions import (
    LaserJobNotFoundError, LaserJobNameExistsError,
    InvalidCSVFormatError, LaserLineItemNotFoundError,
    LaserDXFFileNotFoundError,
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
    """Parse CSV file and return preview with raw content preserved"""
    try:
        content = await file.read()
        csv_text = content.decode('utf-8')

        parsed = LaserplannerService.parse_csv(csv_text)

        return {
            "metadata": parsed["metadata"],
            "headers": parsed["headers"],
            "rows": parsed["rows"],
            "raw_content": parsed["raw_content"],
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
    """Add selected line items to a job and record the CSV import"""
    try:
        selection = payload.get('selection', {})
        selected_row_numbers = selection.get('selected_row_numbers', [])
        csv_metadata = payload.get('csv_metadata', {})
        all_rows = payload.get('all_rows', [])
        raw_content = payload.get('raw_content', '')
        original_filename = payload.get('original_filename', '')

        selected_rows = [
            row for row in all_rows
            if row.get('row_number') in selected_row_numbers
        ]

        job = LaserplannerService.add_line_items(
            db=db,
            job_id=job_id,
            csv_metadata=csv_metadata,
            line_items=selected_rows,
            current_user=current_user,
            original_filename=original_filename,
            raw_content=raw_content,
        )

        return job
    except LaserJobNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

# ============================================================
# CSV IMPORT HISTORY ENDPOINTS
# ============================================================

@router.get("/jobs/{job_id}/csv-imports", response_model=List[CSVImportResponse])
async def list_csv_imports(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """List all CSV imports for a job, newest first"""
    job = LaserplannerService.get_job(db=db, job_id=job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    return LaserplannerService.list_csv_imports(db=db, job_id=job_id)

@router.get("/jobs/{job_id}/csv-imports/{import_id}", response_model=CSVImportDetailResponse)
async def get_csv_import(
    job_id: UUID,
    import_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    """Get a single CSV import with its raw file content"""
    csv_import = LaserplannerService.get_csv_import(db=db, import_id=import_id)
    if not csv_import or csv_import.laser_job_id != job_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import niet gevonden")
    return csv_import

# ============================================================
# DXF FILE ENDPOINTS
# ============================================================

@router.post("/jobs/{job_id}/dxf/upload", response_model=DXFUploadResult)
async def upload_dxf_files(
    job_id: UUID,
    files: List[UploadFile] = File(...),
    import_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Bulk-upload DXF files and match them to line items by filename stem."""
    MAX_DXF_SIZE = 10 * 1024 * 1024  # 10 MB per file
    try:
        file_data = []
        for upload in files:
            content_bytes = await upload.read()
            if len(content_bytes) > MAX_DXF_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"DXF bestand '{upload.filename}' is te groot (max 10 MB)"
                )
            try:
                content_str = content_bytes.decode("utf-8")
            except UnicodeDecodeError:
                content_str = content_bytes.decode("latin-1")
            file_data.append((upload.filename or "unknown.dxf", content_str))

        result = LaserplannerService.upload_dxf_files(
            db=db,
            job_id=job_id,
            files=file_data,
            current_user=current_user,
            import_id=import_id,
        )
        return result
    except LaserJobNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/jobs/{job_id}/dxf", response_model=List[DXFFileResponse])
async def list_dxf_files(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """List all DXF files for a job (thumbnails only, no raw content)."""
    job = LaserplannerService.get_job(db=db, job_id=job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    return LaserplannerService.list_dxf_files(db=db, job_id=job_id)


@router.get("/jobs/{job_id}/dxf/{dxf_id}", response_model=DXFFileDetailResponse)
async def get_dxf_file(
    job_id: UUID,
    dxf_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Get a single DXF file including its raw content (for the viewer)."""
    dxf = LaserplannerService.get_dxf_file(db=db, dxf_id=dxf_id)
    if not dxf or dxf.laser_job_id != job_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DXF bestand niet gevonden")
    return dxf


@router.delete("/jobs/{job_id}/dxf/{dxf_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dxf_file(
    job_id: UUID,
    dxf_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Delete a single DXF file record."""
    dxf = LaserplannerService.get_dxf_file(db=db, dxf_id=dxf_id)
    if not dxf or dxf.laser_job_id != job_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DXF bestand niet gevonden")
    try:
        LaserplannerService.delete_dxf_file(db=db, dxf_id=dxf_id, current_user=current_user)
    except LaserDXFFileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DXF bestand niet gevonden")


@router.post(
    "/jobs/{job_id}/line-items/{item_id}/dxf",
    response_model=SingleDXFUploadResult,
    status_code=status.HTTP_201_CREATED,
)
async def upload_single_dxf_for_item(
    job_id: UUID,
    item_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Upload a single DXF and force-link it to a specific line item."""
    MAX_DXF_SIZE = 10 * 1024 * 1024  # 10 MB
    try:
        content_bytes = await file.read()
        if len(content_bytes) > MAX_DXF_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="DXF bestand is te groot (max 10 MB)"
            )
        try:
            file_content = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            file_content = content_bytes.decode("latin-1")

        dxf_record, filename_mismatch = LaserplannerService.upload_single_dxf_for_item(
            db=db,
            job_id=job_id,
            item_id=item_id,
            original_filename=file.filename or "upload.dxf",
            file_content=file_content,
            current_user=current_user,
        )
        return {"dxf": dxf_record, "filename_mismatch": filename_mismatch}
    except LaserLineItemNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regel niet gevonden")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ============================================================
# LINE ITEM EDIT / DELETE / MANUAL CREATE ENDPOINTS
# ============================================================

@router.patch("/jobs/{job_id}/line-items/{item_id}", response_model=LineItemResponse)
async def update_line_item(
    job_id: UUID,
    item_id: UUID,
    data: LineItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Update editable fields of a line item."""
    try:
        item = LaserplannerService.update_line_item(
            db=db,
            item_id=item_id,
            data=data.model_dump(exclude_unset=True),
            current_user=current_user,
        )
        return item
    except LaserLineItemNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regel niet gevonden")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/jobs/{job_id}/line-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_line_item(
    job_id: UUID,
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Delete a line item and its linked DXF file."""
    try:
        LaserplannerService.delete_line_item(
            db=db, item_id=item_id, current_user=current_user
        )
    except LaserLineItemNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regel niet gevonden")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/jobs/{job_id}/line-items/manual",
    response_model=LineItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_manual_line_item(
    job_id: UUID,
    data: ManualLineItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Manually add a single line item (not from CSV)."""
    try:
        item = LaserplannerService.create_manual_line_item(
            db=db,
            job_id=job_id,
            data=data.model_dump(),
            current_user=current_user,
        )
        return item
    except LaserJobNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
