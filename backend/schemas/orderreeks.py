"""
Pydantic schemas for Orderreeks API
"""

from pydantic import BaseModel, Field, ConfigDict, field_validator
from uuid import UUID
from datetime import datetime
from typing import List


def _validate_no_html(v: str | None, required: bool = True) -> str | None:
    """Shared HTML validation helper for string fields."""
    if v is None:
        return v
    v = v.strip()
    if required and len(v) == 0:
        raise ValueError('Mag niet leeg zijn')
    if '<' in v or '>' in v:
        raise ValueError('Mag geen HTML-tekens bevatten')
    return v


class OrderreeksCreate(BaseModel):
    """
    Schema for creating an orderreeks
    """
    fase_id: UUID = Field(..., description="Fase ID")
    title: str = Field(default="Volledig", description="Title of the orderreeks")
    order_type_ids: List[UUID] = Field(..., description="List of order type IDs to create orders for")

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        """Validate title — no HTML tags allowed"""
        return _validate_no_html(v, required=True)  # type: ignore[return-value]


class OrderreeksUpdate(BaseModel):
    """
    Schema for updating an orderreeks
    """
    title: str | None = Field(None, description="New title")
    status: str | None = Field(None, description="New status (open, in_uitvoering, afgerond)")

    @field_validator('title')
    @classmethod
    def validate_title_update(cls, v: str | None) -> str | None:
        """Validate title in update — no HTML tags allowed"""
        return _validate_no_html(v, required=True)


class OrderBasicResponse(BaseModel):
    """
    Basic order info for orderreeks response
    """
    id: UUID
    sequence_position: int
    status: str
    order_type_name: str
    assigned_to_name: str | None
    posnummer_count: int

    model_config = ConfigDict(from_attributes=True)


class OrderreeksResponse(BaseModel):
    """
    Schema for orderreeks response
    """
    id: UUID
    fase_id: UUID
    title: str
    status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    orders: List[OrderBasicResponse]
    order_count: int
    completed_order_count: int
    progress_percentage: float

    model_config = ConfigDict(from_attributes=True)
