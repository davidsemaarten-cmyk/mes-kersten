import logging

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Body, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

logger = logging.getLogger(__name__)

from database import get_db
from models.user import User
from schemas.laserplanner import (
    JobCreate, JobUpdate, JobResponse, JobWithLineItems,
    CSVUploadResponse, LineItemSelection,
    CSVImportResponse, CSVImportDetailResponse,
    DXFFileResponse, DXFFileDetailResponse, DXFUploadResult,
    SingleDXFUploadResult, LineItemUpdate, ManualLineItemCreate,
    LineItemResponse,
    PDFFileResponse, PDFUploadPreviewResponse, PDFConfirmRequest,
    NCFileResponse, NCUploadResult,
    StepFileResponse, StepUploadResult,
)
from services.laserplanner import LaserplannerService
from services.exceptions import (
    LaserJobNotFoundError, LaserJobNameExistsError,
    InvalidCSVFormatError, LaserLineItemNotFoundError,
    LaserDXFFileNotFoundError, DXFFileMissingFromDiskError,
    LaserPDFFileNotFoundError, PDFProcessingError,
    InvalidStatusTransitionError, JobNotReadyForExportError, JobHasNoLineItemsError,
)
from services.file_storage import PDFStorage
from utils.auth import get_current_user
from utils.permissions import require_admin_or_werkvoorbereider, require_any_authenticated

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

@router.get("/jobs/by-fase/{fase_id}", response_model=List[JobResponse])
async def list_jobs_by_fase(
    fase_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """List all laser jobs for a specific fase"""
    jobs = LaserplannerService.list_jobs_by_fase(db=db, fase_id=fase_id)
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
    except InvalidStatusTransitionError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
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
    try:
        dxf = LaserplannerService.get_dxf_file(db=db, dxf_id=dxf_id)
        if not dxf or dxf.laser_job_id != job_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DXF bestand niet gevonden")
        return dxf
    except DXFFileMissingFromDiskError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="DXF bestand ontbreekt op schijf"
        )


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


# ============================================================
# PDF FILE ENDPOINTS
# ============================================================

MAX_PDF_SIZE = 50 * 1024 * 1024  # 50 MB — multi-page PDFs can be large


@router.post(
    "/jobs/{job_id}/pdf/parse",
    response_model=PDFUploadPreviewResponse,
)
def parse_pdf(
    job_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Parse a PDF, extract Posnr from each page, return a preview with thumbnails.

    Declared as a plain `def` (not async) so FastAPI runs it in a thread-pool
    worker automatically.  This keeps the event loop free during the ~6 second
    CPU-bound PDF processing (PyMuPDF rasterisation + pypdf page splitting).
    """
    try:
        pdf_bytes = file.file.read()  # sync read — UploadFile.file is SpooledTemporaryFile
        if len(pdf_bytes) > MAX_PDF_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="PDF bestand is te groot (max 50 MB)",
            )
        result = LaserplannerService.parse_pdf_upload(
            db=db,
            job_id=job_id,
            filename=file.filename or "upload.pdf",
            pdf_bytes=pdf_bytes,
            current_user=current_user,
        )
        return result
    except HTTPException:
        raise
    except LaserJobNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    except PDFProcessingError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception:
        logger.exception("Unexpected error in parse_pdf for job %s", job_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Er is een onverwachte fout opgetreden bij het verwerken van de PDF",
        )


@router.post(
    "/jobs/{job_id}/pdf/confirm",
    response_model=List[PDFFileResponse],
    status_code=status.HTTP_201_CREATED,
)
def confirm_pdf(
    job_id: UUID,
    body: PDFConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Finalise the PDF upload: split pages, store on disk, create DB records.

    Plain `def` so FastAPI runs this in a thread-pool worker, keeping the
    event loop free during page splitting and thumbnail generation.
    """
    try:
        records = LaserplannerService.confirm_pdf_upload(
            db=db,
            job_id=job_id,
            temp_id=body.temp_id,
            original_filename=body.original_filename,
            confirmed_pages=body.confirmed_pages,
            current_user=current_user,
        )
        return records
    except LaserJobNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    except PDFProcessingError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception:
        logger.exception("Unexpected error in confirm_pdf for job %s", job_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Er is een onverwachte fout opgetreden bij het opslaan van de tekeningen",
        )


@router.get("/jobs/{job_id}/pdf", response_model=List[PDFFileResponse])
async def list_pdf_files(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """List all PDF drawing records for a job (thumbnails included)."""
    job = LaserplannerService.get_job(db=db, job_id=job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    return LaserplannerService.list_pdf_files(db=db, job_id=job_id)


@router.get("/jobs/{job_id}/pdf/{pdf_id}/download")
async def download_pdf_file(
    job_id: UUID,
    pdf_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated),
):
    """
    Download the raw PDF page for a single drawing.

    Accessible to all authenticated roles (werkplaats on tablet can view drawings).
    """
    pdf = LaserplannerService.get_pdf_file(db=db, pdf_id=pdf_id)
    if not pdf or pdf.laser_job_id != job_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tekening niet gevonden")
    try:
        pdf_bytes = PDFStorage.load_bytes(pdf.file_path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF bestand ontbreekt op schijf",
        )
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{pdf.original_pdf_filename}"'},
    )


@router.delete("/jobs/{job_id}/pdf/{pdf_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pdf_file(
    job_id: UUID,
    pdf_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Delete a single PDF drawing record and its file on disk."""
    pdf = LaserplannerService.get_pdf_file(db=db, pdf_id=pdf_id)
    if not pdf or pdf.laser_job_id != job_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tekening niet gevonden")
    try:
        LaserplannerService.delete_pdf_file(db=db, pdf_id=pdf_id, current_user=current_user)
    except LaserPDFFileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tekening niet gevonden")


# ============================================================
# ALMACAM CSV EXPORT
# ============================================================

@router.get("/jobs/{job_id}/export/almacam")
def export_almacam(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Generate an Almacam export ZIP (CSV + DXF files) and return it as a download.

    Updates the job status to 'geexporteerd' and records the export date/user.
    The job must have status 'gereed_voor_almacam' (first export) or 'geexporteerd'
    (re-export) before calling this endpoint.

    Plain `def` so FastAPI runs it in a thread-pool, keeping the event loop free.
    """
    try:
        zip_bytes, filename, is_reexport = LaserplannerService.export_almacam_zip(
            db=db, job_id=job_id, current_user=current_user
        )

        response_headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Reexport-Warning": "true" if is_reexport else "false",
            # Expose the custom header to browsers (required for CORS)
            "Access-Control-Expose-Headers": "Content-Disposition, X-Reexport-Warning",
        }
        return StreamingResponse(
            iter([zip_bytes]),
            media_type="application/zip",
            headers=response_headers,
        )
    except LaserJobNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    except JobNotReadyForExportError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except JobHasNoLineItemsError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception:
        logger.exception("Unexpected error in export_almacam for job %s", job_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Onverwachte fout bij het exporteren naar Almacam",
        )


# ============================================================
# NC FILE ENDPOINTS (DSTV .nc1 from Tekla Structures)
# ============================================================

MAX_NC_SIZE = 5 * 1024 * 1024  # 5 MB per file


@router.post("/jobs/{job_id}/nc/upload", response_model=NCUploadResult)
async def upload_nc_files(
    job_id: UUID,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Bulk-upload NC (.nc1) files and match to line items by filename stem."""
    from services.exceptions import LaserJobNotFoundError as _LaserJobNotFoundError
    try:
        file_data = []
        for upload in files:
            content_bytes = await upload.read()
            if len(content_bytes) > MAX_NC_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"NC bestand '{upload.filename}' is te groot (max 5 MB)",
                )
            try:
                content_str = content_bytes.decode("utf-8")
            except UnicodeDecodeError:
                content_str = content_bytes.decode("latin-1")
            file_data.append((upload.filename or "unknown.nc1", content_str))

        result = LaserplannerService.upload_nc_files(
            db=db, job_id=job_id, files=file_data, current_user=current_user,
        )
        return result
    except _LaserJobNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/jobs/{job_id}/nc", response_model=List[NCFileResponse])
async def list_nc_files(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """List all NC files for a job."""
    job = LaserplannerService.get_job(db=db, job_id=job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    return LaserplannerService.list_nc_files(db=db, job_id=job_id)


@router.get("/jobs/{job_id}/nc/{nc_id}/geometry")
async def get_nc_geometry(
    job_id: UUID,
    nc_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Parse the NC1 file and return geometry as JSON for the 3D viewer."""
    from services.exceptions import LaserNCFileNotFoundError, NCParseError
    nc = LaserplannerService.get_nc_file(db=db, nc_id=nc_id)
    if not nc or nc.laser_job_id != job_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NC bestand niet gevonden")
    try:
        geometry = LaserplannerService.get_nc_geometry(db=db, nc_id=nc_id)
        return geometry
    except LaserNCFileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NC bestand niet gevonden")
    except NCParseError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="NC bestand ontbreekt op schijf",
        )


@router.get("/jobs/{job_id}/nc/{nc_id}/download")
async def download_nc_file(
    job_id: UUID,
    nc_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated),
):
    """Download the raw NC1 file."""
    from services.file_storage import DXFStorage as _DXFStorage
    nc = LaserplannerService.get_nc_file(db=db, nc_id=nc_id)
    if not nc or nc.laser_job_id != job_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NC bestand niet gevonden")
    try:
        content = _DXFStorage.load(nc.file_path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="NC bestand ontbreekt op schijf",
        )
    return StreamingResponse(
        iter([content.encode("utf-8")]),
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{nc.original_filename}"'},
    )


@router.delete("/jobs/{job_id}/nc/{nc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_nc_file(
    job_id: UUID,
    nc_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Delete a single NC file record and its file on disk."""
    from services.exceptions import LaserNCFileNotFoundError
    nc = LaserplannerService.get_nc_file(db=db, nc_id=nc_id)
    if not nc or nc.laser_job_id != job_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NC bestand niet gevonden")
    try:
        LaserplannerService.delete_nc_file(db=db, nc_id=nc_id, current_user=current_user)
    except LaserNCFileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NC bestand niet gevonden")


# ============================================================
# STEP FILE ENDPOINTS (3D CAD .step/.stp files)
# ============================================================

MAX_STEP_SIZE = 50 * 1024 * 1024  # 50 MB per file


@router.post("/jobs/{job_id}/step/upload", response_model=StepUploadResult)
async def upload_step_files(
    job_id: UUID,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Bulk-upload STEP (.step/.stp) files and match to line items by filename stem."""
    from services.exceptions import LaserJobNotFoundError as _LaserJobNotFoundError
    try:
        file_data = []
        for upload in files:
            content_bytes = await upload.read()
            if len(content_bytes) > MAX_STEP_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"STEP bestand '{upload.filename}' is te groot (max 50 MB)",
                )
            file_data.append((upload.filename or "unknown.step", content_bytes))

        result = LaserplannerService.upload_step_files(
            db=db, job_id=job_id, files=file_data, current_user=current_user,
        )
        return result
    except _LaserJobNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/jobs/{job_id}/step", response_model=List[StepFileResponse])
async def list_step_files(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """List all STEP files for a job."""
    job = LaserplannerService.get_job(db=db, job_id=job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job niet gevonden")
    return LaserplannerService.list_step_files(db=db, job_id=job_id)


@router.get("/jobs/{job_id}/step/{step_id}/download")
async def download_step_file(
    job_id: UUID,
    step_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated),
):
    """Download the raw STEP file as binary."""
    from services.file_storage import DXFStorage as _DXFStorage
    step = LaserplannerService.get_step_file(db=db, step_id=step_id)
    if not step or step.laser_job_id != job_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="STEP bestand niet gevonden")
    try:
        content_bytes = _DXFStorage.load_bytes(step.file_path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="STEP bestand ontbreekt op schijf",
        )
    return StreamingResponse(
        iter([content_bytes]),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{step.original_filename}"'},
    )


@router.delete("/jobs/{job_id}/step/{step_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_step_file(
    job_id: UUID,
    step_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider),
):
    """Delete a single STEP file record and its file on disk."""
    from services.exceptions import LaserStepFileNotFoundError
    step = LaserplannerService.get_step_file(db=db, step_id=step_id)
    if not step or step.laser_job_id != job_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="STEP bestand niet gevonden")
    try:
        LaserplannerService.delete_step_file(db=db, step_id=step_id, current_user=current_user)
    except LaserStepFileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="STEP bestand niet gevonden")
