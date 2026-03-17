from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from uuid import UUID
from decimal import Decimal

# ============================================================
# LINE ITEM SCHEMAS
# ============================================================

class LineItemBase(BaseModel):
    projectcode: Optional[str] = None
    fasenr: Optional[str] = None
    posnr: Optional[str] = None
    profiel: Optional[str] = None
    aantal: Optional[int] = None
    lengte: Optional[int] = None
    kwaliteit: Optional[str] = None
    gewicht: Optional[Decimal] = None
    zaag: Optional[str] = None
    opmerkingen: Optional[str] = None
    row_number: int

class LineItemCreate(LineItemBase):
    pass

class LineItemResponse(LineItemBase):
    id: UUID
    laser_job_id: UUID
    csv_import_id: Optional[UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ============================================================
# JOB SCHEMAS
# ============================================================

class JobBase(BaseModel):
    naam: str = Field(..., min_length=1, max_length=255)
    beschrijving: Optional[str] = None
    project_id: Optional[UUID] = None
    fase_id: Optional[UUID] = None

    @field_validator('naam')
    @classmethod
    def validate_naam(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Naam cannot be empty')
        return v.strip()

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    naam: Optional[str] = Field(None, min_length=1, max_length=255)
    beschrijving: Optional[str] = None
    project_id: Optional[UUID] = None
    fase_id: Optional[UUID] = None
    status: Optional[str] = None

LaserJobStatusType = Literal['concept', 'gereed_voor_almacam', 'geexporteerd']


class JobResponse(JobBase):
    id: UUID
    status: LaserJobStatusType
    csv_metadata: Optional[Dict[str, Any]] = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    is_active: bool
    line_item_count: int = 0

    # Almacam export tracking
    export_date:      Optional[datetime] = None
    exported_by:      Optional[UUID] = None
    exported_by_name: Optional[str] = None   # populated by service layer
    export_count:     int = 0

    model_config = ConfigDict(from_attributes=True)

class JobWithLineItems(JobResponse):
    line_items: List[LineItemResponse] = []

    model_config = ConfigDict(from_attributes=True)

# ============================================================
# CSV IMPORT SCHEMAS
# ============================================================

class CSVImportResponse(BaseModel):
    """Summary of a CSV import — without raw_content (for listing)"""
    id: UUID
    laser_job_id: UUID
    original_filename: str
    csv_metadata: Optional[Dict[str, Any]] = None
    uploaded_by: Optional[UUID] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CSVImportDetailResponse(CSVImportResponse):
    """Full CSV import record including the raw file content"""
    raw_content: str

    model_config = ConfigDict(from_attributes=True)

# ============================================================
# CSV UPLOAD SCHEMAS
# ============================================================

class CSVUploadResponse(BaseModel):
    """Response after CSV parsing — includes raw_content so the frontend
    can forward it to the line-items endpoint without re-reading the file."""
    metadata: Dict[str, str]   # First 4 rows
    headers: List[str]          # Row 5
    rows: List[Dict[str, Any]]  # Row 6+ with row_number
    raw_content: str             # Original file text, preserved verbatim

class LineItemSelection(BaseModel):
    """User's selection of which rows to import"""
    selected_row_numbers: List[int]

# ============================================================
# DXF FILE SCHEMAS
# ============================================================

class DXFFileResponse(BaseModel):
    """DXF file record — thumbnail included, raw file_content excluded."""
    id: UUID
    laser_job_id: UUID
    csv_import_id: Optional[UUID] = None
    line_item_id: Optional[UUID] = None
    original_filename: str
    posnr_key: str
    thumbnail_svg: Optional[str] = None
    uploaded_by: Optional[UUID] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DXFFileDetailResponse(DXFFileResponse):
    """DXF file record including the raw DXF text (used by the viewer)."""
    file_content: str

    model_config = ConfigDict(from_attributes=True)

class DXFUploadResult(BaseModel):
    """Result of a bulk DXF upload operation."""
    matched: List[DXFFileResponse]
    unmatched: List[str]   # original filenames that had no matching posnr


class SingleDXFUploadResult(BaseModel):
    """Result of uploading a single DXF file directly linked to a line item."""
    dxf: DXFFileResponse
    filename_mismatch: bool  # True when stem(filename) != item.posnr (warn the user)


# ============================================================
# LINE ITEM SCHEMAS (edit / manual create)
# ============================================================

class LineItemUpdate(BaseModel):
    """Partial update for an existing line item (all fields optional)."""
    profiel: Optional[str] = None
    kwaliteit: Optional[str] = None
    aantal: Optional[int] = None
    opmerkingen: Optional[str] = None


class ManualLineItemCreate(BaseModel):
    """Create a single line item manually (not from CSV)."""
    posnr: Optional[str] = None
    profiel: Optional[str] = None
    kwaliteit: Optional[str] = None
    aantal: Optional[int] = None
    opmerkingen: Optional[str] = None


# ============================================================
# PDF FILE SCHEMAS
# ============================================================

class PDFFileResponse(BaseModel):
    """PDF drawing record — thumbnail included."""
    id: UUID
    laser_job_id: UUID
    line_item_id: Optional[UUID] = None
    original_pdf_filename: str
    page_number: int
    posnr_key: str
    thumbnail_png: Optional[str] = None
    uploaded_by: Optional[UUID] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PDFPagePreview(BaseModel):
    """One page from the parse-phase preview (not stored in DB)."""
    page_number: int
    extracted_posnr: str
    thumbnail_png: str
    match_status: Literal['matched', 'unmatched', 'will_overwrite']


class PDFUploadPreviewResponse(BaseModel):
    """Returned by POST /pdf/parse — client shows this before confirming."""
    temp_id: str
    original_filename: str
    total_pages: int
    skipped_count: int
    pages: List[PDFPagePreview]


class PDFConfirmedPage(BaseModel):
    """Single confirmed page sent by the frontend during the confirm step."""
    page_number: int
    posnr: str                           # empty string = skip this page
    thumbnail_png: Optional[str] = None  # base64 PNG from parse phase; re-used to avoid re-rendering


class PDFConfirmRequest(BaseModel):
    """Request body for POST /pdf/confirm."""
    temp_id: str
    original_filename: str
    confirmed_pages: List[PDFConfirmedPage]


# ============================================================
# NC FILE SCHEMAS (DSTV .nc1 from Tekla Structures)
# ============================================================

class NCFileResponse(BaseModel):
    """NC file record."""
    id: UUID
    laser_job_id: UUID
    line_item_id: Optional[UUID] = None
    original_filename: str
    posnr_key: str
    uploaded_by: Optional[UUID] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NCUploadResult(BaseModel):
    """Result of a bulk NC upload operation."""
    matched: List[NCFileResponse]
    unmatched: List[str]   # original filenames with no matching posnr


# ============================================================
# STEP FILE SCHEMAS (3D CAD .step/.stp files)
# ============================================================

class StepFileResponse(BaseModel):
    """STEP file record."""
    id: UUID
    laser_job_id: UUID
    line_item_id: Optional[UUID] = None
    original_filename: str
    posnr_key: str
    uploaded_by: Optional[UUID] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StepUploadResult(BaseModel):
    """Result of a bulk STEP upload operation."""
    matched: List[StepFileResponse]
    unmatched: List[str]   # original filenames with no matching posnr
