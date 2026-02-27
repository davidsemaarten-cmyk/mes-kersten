from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any
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

class JobResponse(JobBase):
    id: UUID
    status: str
    csv_metadata: Optional[Dict[str, Any]] = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    is_active: bool
    line_item_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class JobWithLineItems(JobResponse):
    line_items: List[LineItemResponse] = []

    model_config = ConfigDict(from_attributes=True)

# ============================================================
# CSV UPLOAD SCHEMAS
# ============================================================

class CSVUploadResponse(BaseModel):
    """Response after CSV parsing"""
    metadata: Dict[str, str]  # First 4 rows
    headers: List[str]  # Row 5
    rows: List[Dict[str, Any]]  # Row 6+ with row_number

class LineItemSelection(BaseModel):
    """User's selection of which rows to import"""
    selected_row_numbers: List[int]  # List of row_number values to import
