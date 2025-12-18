"""
Pydantic schemas for Storage Location API
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class StorageLocationBase(BaseModel):
    """Base schema with common fields"""
    naam: str = Field(..., min_length=1, max_length=100, description="Unique location name")
    beschrijving: Optional[str] = Field(None, description="Optional description of the location")


class StorageLocationCreate(StorageLocationBase):
    """Schema for creating a new storage location"""
    pass


class StorageLocationUpdate(BaseModel):
    """Schema for updating a storage location - all fields optional"""
    naam: Optional[str] = Field(None, min_length=1, max_length=100)
    beschrijving: Optional[str] = None
    actief: Optional[bool] = None


class StorageLocationResponse(StorageLocationBase):
    """Schema for storage location in responses"""
    id: str
    actief: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StorageLocationList(BaseModel):
    """Schema for list of storage locations"""
    items: list[StorageLocationResponse]
    total: int
