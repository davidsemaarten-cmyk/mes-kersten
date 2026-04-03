"""
Pydantic schemas for Project and Fase models
Request/Response validation for project hierarchy
"""

from pydantic import BaseModel, Field, ConfigDict, field_serializer, field_validator
from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
import re

from utils.validators import validate_no_html


# ============================================================
# PROJECT SCHEMAS
# ============================================================

class ProjectBase(BaseModel):
    """Base project schema with validation"""
    code: str = Field(..., min_length=1, max_length=10, description="Unique project code (e.g., 'STAGR')")
    naam: str = Field(..., min_length=1, max_length=500, description="Project name")
    beschrijving: Optional[str] = Field(None, max_length=5000, description="Project description")

    @field_validator('code')
    @classmethod
    def validate_code(cls, v: str) -> str:
        """
        Validate project code format
        - Must be alphanumeric (letters, numbers, hyphens allowed)
        - No special characters or SQL injection patterns
        """
        v = v.strip().upper()

        # Check for dangerous patterns
        if re.search(r"[;'\"\\]|--", v):
            raise ValueError('Project code contains invalid characters')

        # Only allow alphanumeric and hyphens
        if not re.match(r'^[A-Z0-9\-]+$', v):
            raise ValueError('Project code must contain only uppercase letters, numbers, and hyphens')

        return v

    @field_validator('naam')
    @classmethod
    def validate_naam(cls, v: str) -> str:
        """Validate project name — no HTML tags allowed"""
        return validate_no_html(v, required=True)  # type: ignore[return-value]


class ProjectCreate(ProjectBase):
    """Schema for creating a project"""
    pass


class ProjectUpdate(BaseModel):
    """
    Schema for updating a project
    Note: code is NOT editable after creation
    """
    naam: Optional[str] = Field(None, min_length=1, max_length=500)
    beschrijving: Optional[str] = Field(None, max_length=5000)
    status: Optional[str] = Field(None, pattern=r'^(actief|afgerond|geannuleerd)$')

    @field_validator('naam')
    @classmethod
    def validate_naam_update(cls, v: Optional[str]) -> Optional[str]:
        """Validate project name in update — no HTML tags allowed"""
        return validate_no_html(v, required=True)


class ProjectResponse(ProjectBase):
    """
    Schema for project response with full details

    Note: UUID fields automatically serialize to strings in JSON via Pydantic v2
    """
    id: UUID
    status: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    is_active: bool

    # Computed fields (set by service layer)
    fase_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class ProjectWithFases(ProjectResponse):
    """Project response with related fases"""
    fases: List["FaseResponse"] = []


# ============================================================
# FASE SCHEMAS
# ============================================================

class FaseBase(BaseModel):
    """Base fase schema with validation"""
    fase_nummer: str = Field(..., pattern=r'^\d{3}$', description="3-digit fase number (e.g., '001', '042')")
    beschrijving: Optional[str] = Field(None, max_length=500, description="Fase description")
    opmerkingen_intern: Optional[str] = Field(None, max_length=5000, description="Internal notes (werkvoorbereider only)")
    opmerkingen_werkplaats: Optional[str] = Field(None, max_length=5000, description="Workshop notes (visible to werkplaats)")
    montage_datum: Optional[date] = Field(None, description="Planned assembly date")

    @field_validator('fase_nummer')
    @classmethod
    def validate_fase_nummer(cls, v: str) -> str:
        """Validate fase number is exactly 3 digits"""
        if not re.match(r'^\d{3}$', v):
            raise ValueError('Fase nummer must be exactly 3 digits (e.g., "001", "042")')
        return v


class FaseCreate(FaseBase):
    """Schema for creating a fase"""
    project_id: UUID


class FaseUpdate(BaseModel):
    """
    Schema for updating a fase
    Note: project_id and fase_nummer are NOT editable after creation
    """
    beschrijving: Optional[str] = Field(None, max_length=500)
    opmerkingen_intern: Optional[str] = Field(None, max_length=5000)
    opmerkingen_werkplaats: Optional[str] = Field(None, max_length=5000)
    montage_datum: Optional[date] = None
    status: Optional[str] = Field(None, pattern=r'^(actief|gereed|gearchiveerd)$')


class FaseResponse(FaseBase):
    """
    Schema for fase response with full details

    Note: UUID fields automatically serialize to strings in JSON via Pydantic v2
    """
    id: UUID
    project_id: UUID
    status: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    # Computed fields (set by service layer)
    full_code: Optional[str] = None  # e.g., "STAGR-001"
    order_count: Optional[int] = 0
    posnummer_count: Optional[int] = 0
    file_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class FaseWithProject(FaseResponse):
    """Fase response with parent project details"""
    project: Optional[ProjectResponse] = None


# ============================================================
# STATISTICS SCHEMAS
# ============================================================

class ProjectStatistics(BaseModel):
    """
    Statistics for a single project

    Note: UUID fields automatically serialize to strings in JSON via Pydantic v2
    """
    project_id: UUID
    project_code: str
    project_naam: str
    fase_count: int
    total_orders: int = 0
    completed_orders: int = 0
    active_orders: int = 0


class FaseStatistics(BaseModel):
    """
    Statistics for a single fase

    Note: UUID fields automatically serialize to strings in JSON via Pydantic v2
    """
    fase_id: UUID
    fase_nummer: str
    beschrijving: Optional[str]
    order_count: int = 0
    posnummer_count: int = 0
    file_count: int = 0
    claimed_plate_count: int = 0


# Update forward references
ProjectWithFases.model_rebuild()
FaseWithProject.model_rebuild()
