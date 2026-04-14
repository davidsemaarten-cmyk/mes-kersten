"""
Pydantic schemas for FaseFile API
"""

from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional


class FaseFileResponse(BaseModel):
    """
    Schema for fase file response
    """
    id: UUID
    fase_id: UUID
    filename: str
    file_path: str
    file_type: Optional[str]
    file_size: Optional[int]
    uploaded_by: Optional[UUID]
    created_at: datetime
    uploader_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
