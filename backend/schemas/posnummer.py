"""
Pydantic schemas for Posnummer API
"""

from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class PosnummerCreate(BaseModel):
    """
    Schema for creating a posnummer
    """
    posnr: str = Field(..., description="Part number (e.g., '001', '042')", max_length=10)
    materiaal: str | None = Field(None, description="Material (e.g., 'S235', 'RVS 316')")
    profiel: str | None = Field(None, description="Profile (e.g., 'IPE 200')")
    length_mm: int | None = Field(None, description="Length in millimeters")
    width_mm: int | None = Field(None, description="Width in millimeters")
    height_mm: int | None = Field(None, description="Height in millimeters")
    quantity: int = Field(default=1, description="Number of pieces", gt=0)
    notes: str | None = Field(None, description="Additional notes")


class PosnummerUpdate(BaseModel):
    """
    Schema for updating a posnummer
    """
    posnr: str | None = Field(None, description="Part number", max_length=10)
    materiaal: str | None = Field(None, description="Material")
    profiel: str | None = Field(None, description="Profile")
    length_mm: int | None = Field(None, description="Length in millimeters")
    width_mm: int | None = Field(None, description="Width in millimeters")
    height_mm: int | None = Field(None, description="Height in millimeters")
    quantity: int | None = Field(None, description="Number of pieces", gt=0)
    notes: str | None = Field(None, description="Additional notes")


class PosnummerResponse(BaseModel):
    """
    Schema for posnummer response
    """
    id: UUID
    fase_id: UUID
    posnr: str
    materiaal: str | None
    profiel: str | None
    length_mm: int | None
    width_mm: int | None
    height_mm: int | None
    quantity: int
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    dimensions_display: str
    file_count: int

    class Config:
        from_attributes = True
